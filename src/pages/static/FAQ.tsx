import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { FAQ_DATA } from "@/lib/content-data";

const FAQ = () => {
  const [open, setOpen] = useState<string | null>("0-0");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", ...FAQ_DATA.map(c => c.category)];
  const filteredCategories = activeCategory === "All" ? FAQ_DATA : FAQ_DATA.filter(c => c.category === activeCategory);

  return (
    <div className="min-h-screen bg-muted/30">
      <section className="relative bg-gradient-to-br from-[hsl(217,91%,50%)] to-[hsl(224,70%,28%)] pt-24 lg:pt-32 pb-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">Frequently Asked Questions</h1>
          <p className="text-white/60 text-sm sm:text-base max-w-lg mx-auto">Find quick answers to common questions about our services</p>
        </div>
      </section>

      <section className="py-10 sm:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${activeCategory === cat ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground border-border hover:border-primary/40"}`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-8">
            {filteredCategories.map((category, ci) => (
              <div key={category.category}>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-6 rounded-full bg-primary" />
                  {category.category}
                </h2>
                <div className="space-y-2">
                  {category.items.map((faq, fi) => {
                    const key = `${ci}-${fi}`;
                    return (
                      <Card key={key} className="overflow-hidden">
                        <button onClick={() => setOpen(open === key ? null : key)}
                          className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/50 transition-colors">
                          <span className="text-sm font-bold pr-4">{faq.q}</span>
                          <ChevronDown className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform ${open === key ? "rotate-180" : ""}`} />
                        </button>
                        {open === key && (
                          <CardContent className="pt-0 pb-5 px-5">
                            <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQ;
