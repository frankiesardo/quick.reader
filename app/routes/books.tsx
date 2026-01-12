import type { Route } from "./+types/books";
import { Form, href, Link, useNavigation } from "react-router";
import { createBook, getAllBooks, type Book } from "~/services/db";
import { parseEpub } from "~/services/epub";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "~/components/AppHeader";
import { PlusIcon, MoreVerticalIcon } from "~/components/icons";

function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

function ExternalLinkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

function EmptyLibrary() {
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full">
        {/* Decorative book illustration */}
        <div className="relative mb-10">
          <div className="flex justify-center items-end gap-1.5">
            {/* Book spines - creating a mini bookshelf */}
            <div className="w-6 h-28 bg-gradient-to-b from-amber-200 to-amber-300 dark:from-amber-600 dark:to-amber-700 rounded-sm transform -rotate-3 shadow-sm" />
            <div className="w-7 h-32 bg-gradient-to-b from-sky-200 to-sky-300 dark:from-sky-600 dark:to-sky-700 rounded-sm transform rotate-1 shadow-sm" />
            <div className="w-6 h-36 bg-gradient-to-b from-rose-200 to-rose-300 dark:from-rose-600 dark:to-rose-700 rounded-sm shadow-sm" />
            <div className="w-8 h-30 bg-gradient-to-b from-emerald-200 to-emerald-300 dark:from-emerald-600 dark:to-emerald-700 rounded-sm transform -rotate-2 shadow-sm" />
            <div className="w-5 h-26 bg-gradient-to-b from-violet-200 to-violet-300 dark:from-violet-600 dark:to-violet-700 rounded-sm transform rotate-2 shadow-sm" />
          </div>
          {/* Subtle shelf line */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-slate-100 dark:bg-slate-800 rounded-full" />
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl text-slate-900 dark:text-slate-100 mb-2">Your library is empty</h2>
          <p className="text-slate-500 dark:text-slate-400">Upload your first book to start reading</p>
        </div>

        {/* Sample book CTA */}
        <Form method="POST">
          <input type="hidden" name="sampleBook" value="moby-dick" />
          <button
            type="submit"
            disabled={isLoading}
            className="group w-full relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-left transition-all hover:shadow-lg hover:shadow-slate-900/20 disabled:opacity-80 disabled:cursor-wait"
          >
            <div className="relative z-10 flex items-center gap-4">
              {/* Book cover preview */}
              <div className="w-14 h-20 bg-white/10 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🐋</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                  {isLoading ? "Loading..." : "Try reading"}
                </div>
                <div className="text-white font-serif text-lg">Moby Dick</div>
                <div className="text-slate-400 text-sm">Herman Melville</div>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0" />
            </div>
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>
        </Form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">or find books</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* External links */}
        <div className="space-y-3">
          <a
            href="https://www.gutenberg.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">📚</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 dark:text-slate-100">Project Gutenberg</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">70,000+ free public domain ebooks</div>
            </div>
            <ExternalLinkIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors flex-shrink-0" />
          </a>

          <a
            href="https://www.smashwords.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🛒</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 dark:text-slate-100">Smashwords</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">DRM-free indie ebooks</div>
            </div>
            <ExternalLinkIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors flex-shrink-0" />
          </a>

          <a
            href="https://standardebooks.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">✨</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 dark:text-slate-100">Standard Ebooks</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Beautifully formatted classics</div>
            </div>
            <ExternalLinkIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors flex-shrink-0" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Quick Reader" },
    { name: "description", content: "AI Powered Reading" },
  ];
}

export async function clientLoader({}: Route.ClientLoaderArgs) {
  const books = await getAllBooks();
  return { books };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  if (request.method !== "POST") {
    throw new Error("Method not allowed");
  }

  const formData = await request.formData();
  const sampleBook = formData.get("sampleBook") as string | null;

  let file: File;
  if (sampleBook) {
    const response = await fetch(`/${sampleBook}.epub`);
    const blob = await response.blob();
    file = new File([blob], `${sampleBook}.epub`, { type: "application/epub+zip" });
  } else {
    file = formData.get("file") as File;
  }

  const book = await parseEpub(file);
  const id = await createBook(book, file);
  return { id };
}

function BookCard({ book }: { book: Book }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <div className="group">
      {/* Cover with menu overlay */}
      <div className="relative">
        <Link to={href("/books/:bookId", { bookId: book.id })}>
          <div className="aspect-[2/3] rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-sm hover:shadow-lg transition-shadow">
            {book.cover ? (
              <img 
                src={URL.createObjectURL(book.cover)} 
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                <span className="text-slate-400 dark:text-slate-500 text-4xl">📖</span>
              </div>
            )}
          </div>
        </Link>
        
        {/* Three-dot menu - bottom right of cover */}
        <div ref={menuRef} className="absolute bottom-1.5 right-1.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              setMenuOpen(!menuOpen);
            }}
            className="w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition-colors"
            aria-label="Book options"
          >
            <MoreVerticalIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-1 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-10">
              <Form method="DELETE" action={href("/books/:bookId", { bookId: book.id })}>
                <button 
                  type="submit"
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  Delete
                </button>
              </Form>
            </div>
          )}
        </div>
      </div>
      
      {/* Book info */}
      <Link to={href("/books/:bookId", { bookId: book.id })}>
        <div className="mt-2.5">
          <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate leading-snug text-sm">
            {book.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {book.author || "Unknown author"}
          </p>
        </div>
      </Link>
    </div>
  );
}

export default function Books({ loaderData }: Route.ComponentProps) {
  const { books } = loaderData;
  const isEmpty = books.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900">
      <AppHeader
        title="Quick Reader"
        rightContent={
          <Form method="POST" encType="multipart/form-data">
            <label className="px-3 h-9 flex items-center gap-1.5 cursor-pointer bg-blue-600 text-white hover:bg-blue-700 rounded-full transition-colors text-sm font-medium">
              <span>Upload book</span>
              <PlusIcon className="w-5 h-5" />
              <input 
                type="file" 
                name="file" 
                accept=".epub" 
                className="hidden"
                onChange={(e) => e.target.form?.requestSubmit()}
                aria-label="Add book"
              />
            </label>
          </Form>
        }
      />

      {isEmpty ? (
        <EmptyLibrary />
      ) : (
        <main className="flex-1">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
