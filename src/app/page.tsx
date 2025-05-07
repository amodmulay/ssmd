
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl">
          Welcome to Firebase Studio
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          This is a NextJS starter.
        </p>
        <p className="mt-2 text-base text-muted-foreground">
          To get started, take a look at <code className="font-mono bg-muted px-1.5 py-1 rounded-md text-sm">src/app/page.tsx</code>.
        </p>
      </div>
    </main>
  );
}
