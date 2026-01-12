import { href, redirect } from "react-router";

export async function clientLoader() {
  return redirect(href("/books"));
}