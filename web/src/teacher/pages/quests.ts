import type { TeacherPage } from '../context';
import { renderQuestPanel } from '../questsView';
export default {
  title: 'Daily Quests',
  async mount(host, ctx) {
    const html = await renderQuestPanel(ctx.supabase);
    if (ctx.alive()) host.innerHTML = html;
  },
} satisfies TeacherPage;
