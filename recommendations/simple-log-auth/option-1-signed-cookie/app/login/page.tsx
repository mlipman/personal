import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;
  const destination = typeof parameters.next === "string" ? parameters.next : "/";
  const failed = parameters.error === "1";

  return (
    <main style={{ margin: "15vh auto", maxWidth: 420, padding: 24 }}>
      <p className="eyebrow">PRIVATE SPACE</p>
      <h1 style={{ font: "400 48px/1 Georgia, serif" }}>Welcome back.</h1>
      <form action={login} className="composer" style={{ marginTop: 32, padding: 20 }}>
        <input type="hidden" name="next" value={destination} />
        <label htmlFor="password">Password</label>
        <input
          autoComplete="current-password"
          autoFocus
          id="password"
          maxLength={1_024}
          name="password"
          required
          type="password"
          style={{ display: "block", width: "100%", margin: "8px 0 16px", padding: 12 }}
        />
        {failed && <p className="error" role="alert">That password did not work.</p>}
        <button className="primary" type="submit">Log in</button>
      </form>
    </main>
  );
}
