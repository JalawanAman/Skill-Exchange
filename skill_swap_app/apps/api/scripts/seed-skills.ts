import 'dotenv/config'
import { db } from '../src/db'
import { skills } from '../src/db/schema'

/**
 * Seed the master skill catalog (idempotent — skips skills that already exist).
 *   pnpm seed:skills
 */

const CATALOG: Record<string, string[]> = {
  Tech: [
    'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Data Analysis',
    'Machine Learning', 'UI/UX Design', 'Figma', 'Web Design', 'Git', 'Docker',
    'AWS Basics', 'Cybersecurity Basics', 'Flutter', 'Swift', 'Kotlin',
  ],
  Languages: [
    'English', 'Spanish', 'French', 'Arabic', 'Urdu', 'Portuguese', 'German',
    'Japanese', 'Mandarin', 'Hindi',
  ],
  Creative: [
    'Graphic Design', 'Video Editing', 'Photography', 'Illustration', 'Music Production',
    'Guitar', 'Piano', 'Singing', 'Writing', 'Copywriting',
  ],
  Business: [
    'SEO', 'Digital Marketing', 'Content Strategy', 'Public Speaking',
    'Project Management', 'Excel/Sheets', 'Accounting Basics',
  ],
  Fitness: ['Yoga', 'Nutrition', 'Fitness Coaching'],
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function main(): Promise<void> {
  const rows = Object.entries(CATALOG).flatMap(([category, names]) =>
    names.map((name) => {
      const slug = slugify(name)
      return { id: `skill_${slug}`, name, category, slug }
    }),
  )

  await db.insert(skills).values(rows).onConflictDoNothing()

  const total = await db.select().from(skills)
  console.log(`Catalog: ${rows.length} skills. Total now in DB: ${total.length}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('seed failed:', err)
  process.exit(1)
})
