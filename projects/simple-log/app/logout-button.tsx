"use client";

import { logout } from "./login/actions";

export function LogoutButton() {
  return <form action={logout}><button className="logout" type="submit">Log out</button></form>;
}
