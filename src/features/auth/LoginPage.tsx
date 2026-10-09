import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router';
import { z } from 'zod';
import { Loading } from '../../shared/Loading';
import { setServerErrors } from '../../shared/setServerErrors';
import { TextField } from '../../shared/TextField';
import { getRedirectTarget } from './redirect';
import { useSession, type AnonymousReason } from './sessionStore';
import { useSignIn } from './useSignIn';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: 'Enter a valid email.' })),
  password: z.string().min(1, { error: 'Enter your password.' }),
});

type LoginValues = z.infer<typeof loginSchema>;

function getNotice(reason: AnonymousReason): string | null {
  switch (reason) {
    case 'expired':
      return 'Your session has expired. Please sign in again.';
    case 'signedOut':
      return 'You have signed out.';
    case 'none':
      return null;
    default: {
      const unreachable: never = reason;
      return unreachable;
    }
  }
}

export function LoginPage() {
  const session = useSession();
  const location = useLocation();
  const signIn = useSignIn();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (session.status === 'checking') return <Loading />;
  // A successful sign-in flips the session; this redirect is what leaves the page.
  if (session.status === 'authenticated') {
    return <Navigate to={getRedirectTarget(location.state)} replace />;
  }

  async function onSubmit(values: LoginValues) {
    try {
      await signIn.mutateAsync(values);
    } catch (error) {
      setServerErrors(error, setError, ['email', 'password']);
    }
  }

  const notice = getNotice(session.reason);

  return (
    <main className="login">
      <h1>Sign in</h1>
      {notice !== null && <p role="status">{notice}</p>}
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {errors.root?.server && (
          <p role="alert" className="form-error">
            {errors.root.server.message}
          </p>
        )}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
