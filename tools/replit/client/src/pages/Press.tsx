import { ExternalLink, FileText, Newspaper, Radio } from "lucide-react";
import mayorPresser01 from "@assets/mayor-presser-2026-10-05-01.jpg";
import amnyOpedThumb from "@assets/amny-oped-2026-11-08.jpg";
import jointStatementThumb from "@assets/mayor-fcc-roundtable-2026-06-24.jpg";
import gothamistThumb from "@assets/Screenshot_2026-08-07_at_4.15.16_PM_1786133722344.png";
import statementThumb from "@assets/Screenshot_2026-08-14_at_9.24.29_AM_1786713887675.png";
import gothamistFreeThumb from "@assets/gothamist_free_childcare_2026-08-13.webp";

const featuredLinks = [
  {
    id: "shirley-letter",
    outlet: "POP",
    type: "Letter",
    date: "November 25, 2026",
    icon: FileText,
    title: "Thanks (+HBD) to Shirley! · ¡Gracias (y feliz cumpleaños) a Shirley!",
    url: "/shirley/",
    buttonText: "Read the letter · Leer en español",
  },
  {
    id: "amny-oped-seat-at-table",
    outlet: "amNY",
    type: "Op-ed",
    date: "November 8, 2026",
    icon: Newspaper,
    title: "Under Mamdani, child care providers finally have a seat at the table",
    url: "https://www.amny.com/opinion/child-care-providers-have-seat-at-table/",
    buttonText: "Read the op-ed",
    thumbnail: amnyOpedThumb,
  },
  {
    id: "joint-statement-co-governance",
    outlet: "POP + Mayor's Office",
    type: "Statement",
    date: "November 5, 2026",
    icon: FileText,
    title: "Provider Voices and the Mamdani Administration: Universal Child Care & Co-Governance",
    url: "/press/joint-statement",
    thumbnail: jointStatementThumb,
  },
  {
    id: "mayor-free-childcare-waitlist",
    outlet: "NYC Mayor's Office",
    type: "Press release",
    date: "October 5, 2026",
    icon: FileText,
    title: "Mayor Mamdani to Deliver Free Child Care to More Than 10,000 Low-Income Children",
    url: "https://www.nyc.gov/mayors-office/news/2026/10/mayor-mamdani-to-deliver-free-child-care-to-more-than-10-000-low",
    thumbnail: mayorPresser01,
    buttonText: "Read the release",
  },
  {
    id: "gothamist-emergency-grants",
    outlet: "Gothamist",
    type: "Article",
    date: "August 7, 2026",
    icon: Newspaper,
    title: "Mamdani launches emergency grants for home-based childcare providers",
    url: "https://gothamist.com/news/mamdani-launches-emergency-grants-for-home-based-childcare-providers",
  },
  {
    id: "mayor-emergency-microgrants",
    outlet: "NYC Mayor's Office",
    type: "Press release",
    date: "August 7, 2026",
    icon: FileText,
    title: "Mayor Mamdani Announces New Emergency Microgrant Program for Home-Based Child Care Providers",
    url: "https://www.nyc.gov/mayors-office/news/2026/08/mayor-mamdani-announces-new-emergency-microgrant-program-for-hom",
    buttonText: "Read the release",
  },
  {
    id: "pop-statement",
    outlet: "POP",
    type: "Statement",
    date: "August 13, 2026",
    icon: FileText,
    title: "NYC will cover co-pays for Child Care Assistance Programs",
    url: "/statement",
    thumbnail: statementThumb,
  },
  {
    id: "gothamist-free-childcare",
    outlet: "Gothamist",
    type: "Article",
    date: "August 13, 2026",
    icon: Newspaper,
    title: "Mamdani makes childcare free for 22K NYC families",
    url: "https://gothamist.com/news/mamdani-makes-childcare-free-for-22k-nyc-families",
    thumbnail: gothamistFreeThumb,
  },
  {
    id: "gothamist",
    outlet: "Gothamist",
    type: "Article",
    date: "August 6, 2026",
    icon: Newspaper,
    title: "Mamdani's childcare plan faces a hurdle: Home providers can't earn a living",
    url: "https://gothamist.com/news/mamdanis-childcare-plan-faces-a-hurdle-home-providers-cant-earn-a-living",
    thumbnail: gothamistThumb,
  },
  {
    id: "wnyc",
    outlet: "WNYC",
    type: "Listen",
    date: "August 6, 2026",
    icon: Radio,
    title: "Mamdani's childcare plan faces a hurdle: Home providers can't earn a living",
    url: "https://wnyc-news.simplecast.com/episodes/mamdanis-childcare-plan-faces-a-hurdle-home-providers-cant-earn-a-living-n7gUB5SA",
    embed: "https://player.simplecast.com/601eb42d-3cf2-425d-9d5e-0dc939250517?dark=false",
  },
];

export default function Press() {
  return (
    <div className="min-h-screen bg-background pt-32 pb-20">
      <div className="max-w-5xl mx-auto px-6 sm:px-12">
        <h1
          className="font-display text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4"
          data-testid="text-press-page-title"
        >
          PRESS
        </h1>
        <p className="text-foreground/60 text-base sm:text-lg mb-10 max-w-2xl">
          Featured coverage of providers in the fight for universal child care in New York.
        </p>

        <div className="grid items-start sm:grid-cols-2 gap-6">
          {featuredLinks.map((link) => {
            const Wrapper = link.url ? "a" : "div";
            return (
            <Wrapper
              key={link.id}
              {...(link.url
                ? { href: link.url, target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="group flex flex-col border border-border bg-card overflow-hidden hover:border-primary transition-colors"
              data-testid={`link-press-featured-${link.id}`}
            >
              {"thumbnail" in link && link.thumbnail && (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={link.thumbnail}
                    alt={link.title}
                    className={`w-full h-full object-cover ${link.id === "pop-statement" ? "object-top" : ""} group-hover:scale-[1.02] transition-transform duration-300`}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )}
              {"embed" in link && link.embed && (
                <div className="aspect-video flex items-center px-4" onClick={(e) => e.preventDefault()}>
                  <iframe
                    src={link.embed}
                    title={link.title}
                    className="w-full border-0"
                    height="200"
                    seamless
                    data-testid={`player-press-${link.id}`}
                  />
                </div>
              )}
              <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <link.icon className="w-4 h-4 text-primary" />
                <span className="font-display text-xs text-primary tracking-wide uppercase">
                  {link.outlet} · {link.type}
                  <span className="block mt-0.5">{link.date}</span>
                </span>
              </div>
              <h2 className="font-display text-lg sm:text-xl text-foreground leading-snug mb-4 group-hover:text-primary transition-colors">
                {link.title}
              </h2>
              {link.url && (
                <span className="inline-flex items-center gap-1.5 text-foreground/60 text-sm group-hover:text-primary transition-colors">
                  {"buttonText" in link
                    ? link.buttonText
                    : link.type === "Listen"
                      ? "Listen to the segment"
                      : link.type === "Statement"
                        ? "Read the statement"
                        : "Read the story"}
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
              )}
              </div>
            </Wrapper>
          );
          })}
        </div>
      </div>
    </div>
  );
}
