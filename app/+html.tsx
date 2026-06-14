import { ScrollViewStyleReset } from "expo-router/html";

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Primary */}
        <title>Pitch IQ — Daily Football Puzzles</title>
        <meta name="description" content="Daily football puzzle games. Guess the footballer, master the grid, and more — a new challenge every day." />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pitchiq.games" />
        <meta property="og:site_name" content="Pitch IQ" />
        <meta property="og:title" content="Pitch IQ — Daily Football Puzzles" />
        <meta property="og:description" content="Daily football puzzle games. Guess the footballer, master the grid, and more — a new challenge every day." />
        <meta property="og:image" content="https://pitchiq.games/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter/X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Pitch IQ — Daily Football Puzzles" />
        <meta name="twitter:description" content="Daily football puzzle games. Guess the footballer, master the grid, and more — a new challenge every day." />
        <meta name="twitter:image" content="https://pitchiq.games/og-image.png" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}