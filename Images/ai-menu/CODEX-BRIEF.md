# Codex brief: menu photos for one section

You are adding dish photos to ONE menu section of Jimmy's Burger Bar, a real restaurant
whose site is live. The section is named in the prompt that pointed you here. Read
`CLAUDE.md` (project root) before starting; its content rules are binding.

The mechanism already exists and the Steaks section is the finished example
(commit `3631042`). A menu item gets a photo by adding one field in
`src/tenants/jimmys/config.ts`:

```ts
{ name: "250g Fillet Steak", description: "...", price: 140, image: "/images/menu/steaks/fillet-steak.webp" },
```

`MenuThumb` then shows it on the menu board and the order page, on the real site and the
demo. **You do not need to touch any component.**

## Steps

1. **Read the section's items** in `src/tenants/jimmys/config.ts` (`menu.categories`).
2. **Real photos first.** Check `Images/LABELS.md` and the table below. A real photo of
   the dish always beats a generated one. Only generate what has no real photo.
3. **Look at the reference photos** for the section (table below) with your image viewer
   before generating anything.
4. **Generate one image per distinct dish** with your image generation tool. Size
   variants of the same dish (e.g. 200g / 300g) share one image. Use the style block
   below, plus one line for the dish, built ONLY from its config `description`.
5. **Check every image yourself** before keeping it. Regenerate (max 3 tries per dish)
   if it has: an ingredient not in the description, a missing listed ingredient, text,
   logos, hands, a studio/advert look, glowing oversaturated colour, or a plate/bun that
   doesn't match the references. If 3 tries fail, keep the best and flag it in your report.
6. **Save originals** as PNG: `Images/ai-menu/<section-slug>/<dish-slug>.png`.
7. **Convert** each photo (real or generated) to the site thumbnail:
   `node ~/.local/share/menu-image-tools/to-webp.mjs <input> public/images/menu/<section-slug>/<dish-slug>.webp`
   (480px square WebP. Do not install packages; this tool already works.)
8. **Wire it up:** add `image: "/images/menu/<section-slug>/<dish-slug>.webp"` to each
   item in that section. If any image is generated, add this comment above the
   section's `note:` (same as Steaks):
   `// <Section> photos are AI-generated (Codex, <date>) under the CLAUDE.md` /
   `// AI-imagery override and logged there. Swap for real photos when shot.`
   Name which items are real if the section is mixed.
9. **Log it:** add one row to the "Known outstanding content issues" table in `CLAUDE.md`,
   modelled on the "Steak menu photos are AI-generated" row.
10. **Verify:** `npm run check`, then `npm test` (all must pass), then `npm run build`.

## Out of scope: do NOT
- change any item name, price, description, `popular` flag or any other section
- edit components, pages, styles, Supabase files, seeds or migrations
- edit, retouch or recolour a real photograph (only the converter may crop it)
- commit, push or deploy. Claude reviews your diff first.

## Report when done
A table: item → image path → REAL (source file) or AI → attempts → anything you're
unsure about. Plus the check/test/build results.

## Style block (paste into every generation, then add the dish line)

```
Realistic photo of a dish from a small South African burger bar & grill, matching the
reference photos: same plates/crockery, same warm wooden table, same warm natural light,
same honest home-style portion. Square 1:1, 3/4 angle (about 30 degrees), the whole dish
visible and centred.

Make it look like a real phone photo taken by the restaurant staff at the table, not a
studio or advertising shoot. Natural, slightly muted colours like the references: no
boosted saturation, no glowing orange or golden tones, no HDR, no cinematic grade.
Chips pale-to-medium golden with uneven cuts and some darker ends. Real imperfections:
a few crumbs, a small sauce smear, food slightly asymmetric. Normal phone depth of field,
soft natural shadows, slight grain. Nothing glossy, waxy, plastic or sprayed with oil.

No smoke, no flames, no floating ingredients, no garnish added for show, no hands,
no text, no logos, no writing on the plate. Show ONLY the listed ingredients.
```

## Per-section references

| Section | Look | Reference photos to view first | Real photos already available |
|---|---|---|---|
| Burgers | Toasted sesame bun charred underneath, grey-blue stoneware plate, thick-cut chips in a stoneware cup beside it | `Images/imgi_32_707724895_18114671461842606_4746450562192002188_n.jpg`, `Images/imgi_36_671750349_18113504620842606_6965929189355657895_n.jpg` | **Beef Burger** = `public/images/gallery/burger-macro.jpg` (real; convert it, don't generate) |
| Steaks, Chicken Meals, Salads | Deep-blue speckled stoneware plate | `Images/imgi_30_708528340_18114985108842606_3242999530748613683_n.jpg`, `Images/imgi_26_717974111_18115736182842606_5720528276708049940_n.jpg` | none |
| Breakfast | Dark slate plate | `Images/imgi_18_572603815_18094471000842606_1555534369027119021_n.jpg` | **Jimmy's Breakfast** = `public/images/gallery/breakfast-plate.jpg` |
| Platters | Blue plate / board, generous | `Images/imgi_30_...` above | **Warrior Platter** = `public/images/menu/warrior-platter.jpeg` |
| Anything else | Ask before generating | | |

Section notes live in config too: honour them (e.g. Steaks: "With chips and onion rings
or salad"; Breakfast is served until 12).
