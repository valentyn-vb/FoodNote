'use client';

import {
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { AiParseRequest } from '@foodnote/shared';
import { MicIcon, SquareIcon } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { UseFormReturn } from 'react-hook-form';

/**
 * Dictation through the browser's own recogniser. Nothing is uploaded by us and
 * there is no endpoint: the words arrive as text and go straight into the
 * description field, which the user then parses as if they had typed it.
 *
 * The trade is coverage. Chrome, Edge and Safari implement this; Firefox does
 * not, which is why the control is hidden rather than disabled. Chrome's
 * recogniser is also a cloud service — the audio leaves the device, just not
 * through us — so this is not a privacy improvement over a server route, only a
 * simpler one. See ADR-0011 for the route this replaced and what it cost.
 */

/**
 * lib.dom.d.ts (TS 5.9) types SpeechRecognitionResultList and friends but not
 * the constructor or its events — the API is still prefixed in Chrome. Only the
 * surface used below is declared; the result types come from the DOM lib.
 */
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionResultEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function recognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Capabilities don't change within a session, and getSnapshot runs often. */
let supportCache: boolean | undefined;

function detectSupport(): boolean {
  supportCache ??= !!recognitionConstructor();
  return supportCache;
}

/** The probe has nothing to subscribe to; it is read once and settles. */
const noSubscribe = () => () => {};

/**
 * A forgotten open mic is the failure mode worth guarding: Chrome will keep a
 * continuous session alive well past anything a meal description needs.
 */
const MAX_SECONDS = 60;

type VoiceStatus = 'idle' | 'requesting' | 'listening' | 'blocked' | 'error';

function joinText(base: string, spoken: string): string {
  const trimmed = base.trim();
  return trimmed && spoken ? `${trimmed} ${spoken}` : trimmed || spoken;
}

/** `0:07`, so the elapsed time reads as a duration rather than a count. */
function formatElapsed(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * The recognition session as a state machine, kept out of the JSX below but not
 * out of the file: there is one caller, and this repo splits per feature rather
 * than per concern (see meal-log-drawer.tsx).
 *
 * `getBaseText` is snapshotted at `start`, so dictation adds to whatever the
 * user had already typed instead of replacing it. `onTranscript` then receives
 * the whole composed value on every committed segment — set it, don't append.
 */
function useVoiceInput({
  getBaseText,
  onTranscript,
  onError,
}: {
  getBaseText: () => string;
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
}) {
  // useSyncExternalStore with a `false` server snapshot, the same shape
  // use-media-query.ts uses: hydration matches the server, then syncs to the
  // real client value. The constructor does not exist while rendering on the
  // server, so a probe during render would be a hydration mismatch.
  const supported = useSyncExternalStore(
    noSubscribe,
    detectSupport,
    () => false,
  );
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [interim, setInterim] = useState('');
  const [seconds, setSeconds] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef('');
  const spokenRef = useRef('');
  // `end` fires after `error` too, and must not overwrite the state the error
  // put us in — 'blocked' is the whole reason the user sees an explanation.
  const failedRef = useRef(false);

  const teardown = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onstart = null;
    recognition.onend = null;
    recognition.abort();
    recognitionRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  useEffect(() => {
    if (status !== 'listening') return;

    const timer = setInterval(() => {
      setSeconds((elapsed) => {
        const next = elapsed + 1;
        if (next >= MAX_SECONDS) recognitionRef.current?.stop();
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  const start = useCallback(() => {
    const Recognition = recognitionConstructor();
    if (!Recognition || status === 'listening' || status === 'requesting') {
      return;
    }

    baseRef.current = getBaseText();
    spokenRef.current = '';
    failedRef.current = false;
    setInterim('');
    setSeconds(0);
    setStatus('requesting');

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    // The parser prompt answers in the description's own language, so following
    // the browser's locale costs nothing and makes non-English dictation work.
    recognition.lang = navigator.language;

    recognition.onstart = () => setStatus('listening');

    recognition.onresult = (event) => {
      let pending = '';
      // From resultIndex, not 0: earlier results are already in spokenRef, and
      // re-reading them would duplicate every committed segment.
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) spokenRef.current += result[0].transcript;
        else pending += result[0].transcript;
      }
      setInterim(pending.trim());
      if (spokenRef.current) {
        onTranscript(joinText(baseRef.current, spokenRef.current.trim()));
      }
    };

    recognition.onerror = (event) => {
      // We called abort(); nothing went wrong.
      if (event.error === 'aborted') return;

      failedRef.current = true;
      setInterim('');

      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed'
      ) {
        setStatus('blocked');
        return;
      }
      if (event.error === 'no-speech') {
        setStatus('idle');
        onError("Didn't catch that. Try again, or type it out.");
        return;
      }
      setStatus('error');
    };

    recognition.onend = () => {
      setInterim('');
      if (!failedRef.current) setStatus('idle');
      recognitionRef.current = null;
    };

    recognition.start();
  }, [getBaseText, onError, onTranscript, status]);

  const stop = useCallback(() => recognitionRef.current?.stop(), []);

  return { supported, status, interim, seconds, start, stop };
}

/**
 * The mic for the description field: it owns the dictation session and writes
 * straight into `parseForm`, so the drawer hosting it needs to know nothing
 * about speech. Takes the form rather than value/onChange callbacks, the same
 * way `DescriptionField` does — the field is the thing being dictated into.
 *
 * Renders as the `InputGroup`'s block-end addon, and renders **nothing** where
 * the browser has no recogniser (Firefox): an empty addon would still add its
 * own row to the group.
 *
 * Mounting is the lifecycle. Leaving the input step — closing the drawer,
 * parsing, switching to the manual form — unmounts this and the session ends
 * with it, so there is no path where a step change leaves the mic open.
 *
 * There is no pulse or level meter on purpose: the elapsed counter and the
 * interim words are the "it is listening" signal, which keeps this out of the
 * reduced-motion exemption list that JS-driven motion would need.
 */
export function VoiceDictation({
  parseForm,
}: {
  parseForm: UseFormReturn<AiParseRequest>;
}) {
  /** The session composes dictation onto whatever was already typed and hands
      back the whole value, so this sets rather than appends. `shouldValidate`
      keeps the Parse button's enabled state the resolver's verdict. */
  const applyTranscript = useCallback(
    (text: string) =>
      parseForm.setValue('description', text, { shouldValidate: true }),
    [parseForm],
  );

  const readBaseText = useCallback(
    () => parseForm.getValues('description'),
    [parseForm],
  );

  /** Voice trouble is about the description, so it goes where a description
      error goes — the field, not a toast (the Forms rule). */
  const showVoiceError = useCallback(
    (message: string) => parseForm.setError('description', { message }),
    [parseForm],
  );

  const voice = useVoiceInput({
    getBaseText: readBaseText,
    onTranscript: applyTranscript,
    onError: showVoiceError,
  });

  if (!voice.supported) return null;

  const { status, seconds, interim } = voice;
  const listening = status === 'listening';

  return (
    <InputGroupAddon align="block-end" className="justify-end">
      {/* Mounted with the addon rather than with the listening state: a live
          region has to exist before its text changes, or the change is never
          announced. */}
      <span aria-live="polite" className="sr-only">
        {listening ? 'Listening. Speak now.' : ''}
      </span>

      {listening && (
        // The uncommitted words, so it is visibly hearing something before any
        // of it reaches the field. Truncated: the field is where text belongs.
        <InputGroupText className="min-w-0">
          <span className="shrink-0">
            {formatElapsed(seconds)} / {formatElapsed(MAX_SECONDS)}
          </span>
          {interim && <span className="truncate italic">{interim}</span>}
        </InputGroupText>
      )}
      {/* Not a FieldError: nothing about the typed description is invalid, and
          the fix is in browser settings rather than in the field. */}
      {status === 'blocked' && (
        <InputGroupText>
          Microphone blocked — allow it in your browser settings.
        </InputGroupText>
      )}
      {status === 'error' && (
        <InputGroupText>
          Dictation stopped working. Please type it instead.
        </InputGroupText>
      )}

      <InputGroupButton
        size="icon-sm"
        aria-label={listening ? 'Stop dictation' : 'Dictate your meal'}
        disabled={status === 'requesting'}
        onClick={listening ? voice.stop : voice.start}
        // Listening is the one state worth colouring: it is the only one the
        // user has to act on to leave.
        className={cn(
          'shrink-0',
          listening ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {status === 'requesting' ? (
          <Spinner />
        ) : listening ? (
          <SquareIcon />
        ) : (
          <MicIcon />
        )}
      </InputGroupButton>
    </InputGroupAddon>
  );
}
