import { SignUp } from '@clerk/clerk-react';

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          appearance={{
            layout: {
              logoPlacement: 'none',
              showOptionalFields: false,
            },
            elements: {
              formButtonPrimary:
                'bg-primary hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20',
              card: 'border border-border/40 shadow-xl rounded-2xl',
              footer: 'hidden',
            },
          }}
        />
      </div>
    </div>
  );
}
