import Link from 'next/link';

/** The 404 is a real room. Copy is §I.4, verbatim. */
export default function NotFound() {
  return (
    <section id="section-outside" aria-labelledby="h-outside" className="room-shell">
      <h2 id="h-outside">you found the outside. there isn&apos;t one.</h2>
      <Link className="next-link" href="/?s=origin">
        origin
      </Link>
    </section>
  );
}
