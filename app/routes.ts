import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("routes/home.ts"), // Redirects to /books
  route("books", "routes/books.tsx"),
  route("books/:bookId", "routes/books.$bookId.tsx"),  
  route("*", "routes/catchAll.ts"), // Catch-all to suppress epub.js internal path warnings (e.g., /OEBPS/content.opf)
] satisfies RouteConfig;
