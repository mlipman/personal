import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;
  const destination = typeof parameters.next === "string" ? parameters.next : "/";
  const failed = parameters.error === "1";

  return (
    <main className="login-shell">
      <p className="eyebrow">PRIVATE SPACE</p>
      <h1>Welcome back.</h1>
      <form action={login} className="login-card">
        <input type="hidden" name="next" value={destination} />
        <label htmlFor="password">Password</label>
        <input
          aria-invalid={failed}
          autoComplete="current-password"
          autoFocus
          id="password"
          maxLength={1_024}
          name="password"
          required
          type="password"
        />
        {failed && <p className="error" role="alert">That password did not work.</p>}
        <button className="primary" type="submit">Log in</button>
      </form>
    </main>
  );
}
