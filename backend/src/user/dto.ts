export interface RegisterRequestDto {
  email: string;
  password: string;
}

export interface UserResponseDto {
  id: string;
  email: string;
  createdAt: string;
}
