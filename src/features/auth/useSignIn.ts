import { useMutation } from '@tanstack/react-query';
import { api } from '../../app/api';
import { setSession } from './sessionStore';

// signIn resolves to the user only, so the device_session_token never lands
// in mutation.data.
export function useSignIn() {
  return useMutation({
    mutationFn: api.signIn,
    onSuccess: (user) => {
      setSession({ status: 'authenticated', user });
    },
  });
}
