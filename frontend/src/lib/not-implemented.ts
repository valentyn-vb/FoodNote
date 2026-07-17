import { toast } from 'sonner';

export function notImplemented(action: string) {
  toast.info(`${action} isn't wired up yet — this is a rough skeleton.`);
}
