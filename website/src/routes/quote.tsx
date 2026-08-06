import { createFileRoute } from "@tanstack/react-router";
import { Reveal } from "@/components/site/Reveal";
import { useState, type FormEvent } from "react";
import { Upload, CheckCircle2, ArrowUpRight } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/quote")({
  head: () => ({
    meta: [
      { title: "Request a Quote — TechFocal Enterprises LLP" },
      { name: "description", content: "Send us your drawing and requirements. We'll respond with a detailed quotation." },
      { property: "og:title", content: "Request a Quote — TechFocal" },
      { property: "og:description", content: "Get a detailed manufacturing quotation from TechFocal." },
    ],
  }),
  component: Quote,
});

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z.string().trim().min(6, "Enter a valid phone").max(30),
  requirements: z.string().trim().min(10, "Tell us a bit more about your requirement").max(2000),
});

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-foreground">{label}</div>
      <div className="mt-2">{children}</div>
      {error && <div className="mt-1.5 text-xs text-destructive">{error}</div>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition";

function Quote() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: fd.get("name"),
      company: fd.get("company"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      requirements: fd.get("requirements"),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[issue.path[0] as string] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitted(true);
  };

  return (
    <section className="section bg-background">
      <div className="container-x grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Reveal><div className="eyebrow">Request a quote</div></Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 text-5xl md:text-6xl">
              Tell us what to <span className="italic text-primary">make.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-[15.5px] text-muted-foreground leading-relaxed">
              Share your drawing and requirements. We'll respond with a detailed quotation
              — typically within 24 business hours.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <ul className="mt-8 space-y-3 text-sm">
              {["Detailed itemised pricing", "Realistic delivery estimate", "Confidential — used only for quoting"].map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-secondary" /> {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal direction="right" delay={0.1} className="lg:col-span-7">
          <div className="card-soft p-8 md:p-10">
            {submitted ? (
              <div className="text-center py-12">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary/15 text-secondary">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-2xl">Thanks — we've got it.</h3>
                <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
                  Our team will review your requirement and respond with a detailed quotation within 24 business hours.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2" noValidate>
                <Field label="Name *" error={errors.name}>
                  <input name="name" className={inputClass} placeholder="Your full name" />
                </Field>
                <Field label="Company" error={errors.company}>
                  <input name="company" className={inputClass} placeholder="Company (optional)" />
                </Field>
                <Field label="Email *" error={errors.email}>
                  <input type="email" name="email" className={inputClass} placeholder="you@company.com" />
                </Field>
                <Field label="Phone *" error={errors.phone}>
                  <input name="phone" className={inputClass} placeholder="+91 …" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Requirements *" error={errors.requirements}>
                    <textarea
                      name="requirements"
                      rows={5}
                      className={inputClass + " resize-none"}
                      placeholder="Part description, material, quantity, tolerance, delivery window…"
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-medium">Upload drawing</div>
                  <label className="mt-2 flex items-center justify-between gap-4 rounded-xl border border-dashed border-border bg-cream px-5 py-6 cursor-pointer hover:border-primary transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="grid h-11 w-11 place-items-center rounded-lg bg-background border border-border">
                        <Upload className="h-4 w-4 text-primary" />
                      </span>
                      <div>
                        <div className="text-sm font-medium">
                          {file ? file.name : "Click to upload a file"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Accepted: PDF, DWG, DXF, STEP, images · up to 20 MB
                        </div>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.dwg,.dxf,.step,.stp,image/*"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    <span className="text-xs text-primary font-medium hidden sm:inline">Browse</span>
                  </label>
                </div>
                <div className="sm:col-span-2 mt-2">
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background px-6 py-4 text-sm font-medium hover:bg-primary transition-colors"
                  >
                    Submit Request <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
