export type PostStyle = 'professional' | 'storytelling' | 'viral_hook';

export const STYLE_INSTRUCTIONS: Record<PostStyle, string> = {
  professional: `STYLE: Professional
- Clear, credible, and actionable
- Use specific details, practical frameworks, and takeaways
- Avoid hype or exaggerated claims
- End with a thoughtful CTA (question or next step)` ,

  storytelling: `STYLE: Storytelling
- Start with a relatable moment or tension
- Use short scenes, vivid but realistic details
- Include a lesson learned and a practical takeaway
- End with a question inviting others to share their experience` ,

  viral_hook: `STYLE: Viral hook
- First line must be scroll-stopping (strong claim, contrarian take, or curiosity gap)
- Use short lines and punchy rhythm
- Deliver value fast (bullets, steps, or a mini-framework)
- End with a high-signal CTA ("Agree?" / "What would you add?")` ,
};

export function getStyleInstructions(style: PostStyle): string {
  return STYLE_INSTRUCTIONS[style] || STYLE_INSTRUCTIONS.professional;
}
