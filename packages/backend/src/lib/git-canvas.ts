import path from 'path';
import { randomUUID } from 'crypto';

// Lazy-load simple-git so the server doesn't crash if git isn't available
let simpleGit: typeof import('simple-git') | null = null;
async function getGit() {
  if (!simpleGit) {
    try {
      simpleGit = await import('simple-git');
    } catch {
      return null;
    }
  }
  return simpleGit;
}

const DRAFT_BRANCH_PREFIX = 'choreostudio/drafts/';
const RELEASE_BRANCH = 'main';
const CANVASES_DIR = 'canvases';

export const gitCanvas = {
  async writeDraft(canvasId: string, slug: string, content: string): Promise<void> {
    const sg = await getGit();
    if (!sg) return;
    const git = sg.default(process.cwd());
    const branch = `${DRAFT_BRANCH_PREFIX}${slug}`;

    try {
      const branches = await git.branchLocal();
      if (!branches.all.includes(branch)) {
        await git.checkoutBranch(branch, RELEASE_BRANCH);
      } else {
        await git.checkout(branch);
      }
      const filePath = path.join(CANVASES_DIR, `${slug}.json`);
      const { writeFile, mkdir } = await import('fs/promises');
      await mkdir(CANVASES_DIR, { recursive: true });
      await writeFile(filePath, content, 'utf8');
      await git.add(filePath);
      await git.commit(`chore(canvas): update draft ${slug}`, ['--no-verify']);
      await git.checkout(RELEASE_BRANCH);
    } catch {
      // Non-fatal — git ops are best-effort
      try { await git.checkout(RELEASE_BRANCH); } catch { /* ignore */ }
    }
  },

  async readDraft(slug: string): Promise<string | null> {
    const sg = await getGit();
    if (!sg) return null;
    try {
      const git = sg.default(process.cwd());
      const branch = `${DRAFT_BRANCH_PREFIX}${slug}`;
      const filePath = path.join(CANVASES_DIR, `${slug}.json`);
      const content = await git.show([`${branch}:${filePath}`]);
      return content;
    } catch {
      return null;
    }
  },

  async promoteToRelease(canvasId: string): Promise<void> {
    // On approval, merge the draft branch to main via fast-forward
    const sg = await getGit();
    if (!sg) return;
    try {
      const git = sg.default(process.cwd());
      const branches = await git.branchLocal();
      const draftBranch = branches.all.find(b => b.startsWith(DRAFT_BRANCH_PREFIX) && b.endsWith(canvasId));
      if (!draftBranch) return;
      await git.checkout(RELEASE_BRANCH);
      await git.merge([draftBranch, '--no-ff', '--no-verify', '-m', `feat(canvas): promote approved canvas ${canvasId}`]);
    } catch {
      // Non-fatal
    }
  },
};
