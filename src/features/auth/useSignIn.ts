import { useMutation } from '@tanstack/react-query';
import { api } from '../../app/api';
import { setSession } from './sessionStore';

// signIn resolves to the user only, so the device_session_token never lands
// in mutation.data.
export function useSignIn() {
  return useMutation({
    mutationFn: api.signIn,
    // The mutation's variables are the credentials, password included. The
    // default gcTime keeps a finished mutation in the MutationCache (and in
    // DevTools) for 5 minutes; 0 drops it as soon as the form stops observing it.
    gcTime: 0,
    onSuccess: (user) => {
      setSession({ status: 'authenticated', user });
    },
  });
}
