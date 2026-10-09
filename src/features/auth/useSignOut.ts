import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../app/api';
import { setSession } from './sessionStore';

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.signOut,
    // Runs after a failed revoke too: the user asked to leave, so the local
    // session ends regardless. The session goes first so that the guard
    // unmounts protected pages instead of letting them refetch cleared data.
    onSettled: () => {
      setSession({ status: 'anonymous', reason: 'signedOut' });
      queryClient.clear();
    },
  });
}
