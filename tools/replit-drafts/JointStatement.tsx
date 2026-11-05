import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import roundtablePhoto from "@assets/mayor-fcc-roundtable-2026-06-24.jpg";

// POP members: homepage POP MEMBERS list plus Day Care Council of New York (Ben, 2026-11-05).
const popMembers = [
  "Early Childhood Educators On The Move",
  "Alliance for Quality Education",
  "New York Communities for Change",
  "Make the Road New York",
  "Citizen Action of New York",
  "United Federation of Teachers",
  "Cornell Worker Institute",
  "Las Doñas",
  "The Action Lab",
  "Consortium for Worker Education",
  "NY Union Child Care Coalition",
  "CSEA VOICE",
  "DC 37 AFSCME",
  "MomsRising",
  "Empire State Campaign for Child Care",
  "Day Care Council of New York",
];

// Joint statement from MOCCECE, OME and POP (jointly approved text; keep wording as is).
export default function JointStatement() {
  return (
    <div className="min-h-screen bg-background pt-32 pb-20">
      <article className="max-w-3xl mx-auto px-6 sm:px-12">
        <Link
          href="/press"
          className="inline-flex items-center gap-1.5 text-foreground/60 text-sm hover:text-primary transition-colors mb-8"
          data-testid="link-back-to-press"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to press
        </Link>

        <p className="font-display text-xs text-primary tracking-wide uppercase mb-4">
          Joint statement · November 5, 2026
        </p>
        <h1
          className="font-display text-3xl sm:text-4xl lg:text-5xl text-foreground leading-tight mb-3 text-balance"
          data-testid="text-joint-statement-title"
        >
          Provider Voices and the Mamdani Administration:
        </h1>
        <p className="font-display text-xl sm:text-2xl text-primary leading-snug mb-10 text-balance">
          Universal Child Care &amp; Co-Governance
        </p>

        <figure className="mb-10">
          <img
            src={roundtablePhoto}
            alt="Mayor Mamdani sits in a circle with family child care providers and POP members at an FCC program roundtable in the Bronx"
            className="w-full aspect-video object-cover border border-border"
            decoding="async"
          />
        </figure>

        <p className="italic text-foreground/80 text-base sm:text-lg leading-relaxed mb-10">
          Today, Providers Organized for Power (POP), the Mayor’s Office of Child Care and Early Childhood Education (MOCCECE), and the Mayor’s Office of Mass Engagement (OME) shared a joint statement on the shared policy table we’ve built this year, where child care providers and advocates are helping to shape NYC’s child care policy. This statement celebrates the start of this journey, and recognizes our shared commitment to building co-governance structures and practices to meet this moment. For too long, family child care providers have been left out of the city’s child care expansions. This statement names that harm, and it puts provider wages at the center of our work together-- because we have no child care system without the educators who provide this essential care.
        </p>

        <h2 className="font-display text-xl sm:text-2xl text-foreground leading-snug mb-6 w-full">
          Provider Voices and the Mamdani Administration: Universal Child Care &amp; Co-Governance
        </h2>

        <div className="text-foreground text-base sm:text-lg leading-relaxed space-y-6">
          <p>
            The Mayor’s Office and Providers Organized for Power (POP), a coalition of child care
            providers and their advocates, have built a shared policy table that meets regularly to
            inform the Mamdani administration’s child care strategy, including the design,
            implementation, and evaluation of child care policy in New York City. This shared table
            signals the administration’s commitment to co-governance with those workers and educators
            most impacted by the administration's policy decisions, as well as its acknowledgement of
            past harms to Family Child Care (FCC) providers in particular, who were not sufficiently
            consulted during prior child care expansions, leading to their exclusion and
            marginalization within the city’s public child care system. At the heart of this shared
            table is a shared commitment to addressing the deeply inadequate wages of child care
            providers in the city. We know that we have no child care system without our child care
            workforce, and providers’ wages must reflect the dignity of the essential, skilled work
            they do.
          </p>
          <p>
            In the first nine months of the Mamdani Administration, this shared policy table has
            already begun the real practice of co-governance and shared decision-making through:
          </p>
          <ul className="list-disc pl-6 space-y-3 marker:text-primary">
            <li>
              The launch of an emergency microgrant fund for FCC providers, a first-of-its-kind $3
              million fund co-designed with a working group of family child care providers, POP
              members, and Mayor’s Office representatives;
            </li>
            <li>Ongoing support for FCC providers’ efforts to build cooperative business models;</li>
            <li>
              An FCC listening tour throughout the city, co-hosted by POP and Mayor’s Office of Child
              Care, that culminated in the Mayor’s visit to an FCC program roundtable in the Bronx.
            </li>
            <li>
              Publishing a joint{" "}
              <a
                href="https://www.amny.com/opinion/building-city-values-home-based-providers/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:opacity-80"
              >
                op-ed
              </a>{" "}
              by Mayor Mamdani and a family child care provider, Juanita Holloway, to acknowledge past
              harm and highlight the ongoing injustices faced by FCCs.
            </li>
          </ul>
          <p>
            As they continue to work together, MOCCECE, OME, and POP will test and refine
            co-governance approaches that will strengthen not only the City’s offerings in the ECE
            field, but the potential of co-governance structures in the many other critical issues.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 gap-6">
          <div className="border border-border bg-card p-6">
            <h2 className="font-display text-sm text-primary tracking-wide uppercase mb-3">
              City Participants
            </h2>
            <p className="text-foreground leading-relaxed">
              Mayor’s Office of Child Care and Early Childhood Education (MOCCECE)
              <br />
              The Mayor’s Office of Mass Engagement (OME)
            </p>
          </div>
          <div className="border border-border bg-card p-6">
            <h2 className="font-display text-sm text-primary tracking-wide uppercase mb-3">
              Providers Organized for Power Members
            </h2>
            <ul className="text-foreground leading-relaxed">
              {popMembers.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        </div>
      </article>
    </div>
  );
}
