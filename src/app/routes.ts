export type View = 'home' | 'module' | 'lesson' | 'stamps' | 'settings' | 'labs' | 'teacher' | 'challenges' | 'challenge' | 'compare' | 'help';
export interface Route { view: View; lessonId?: string; module?: string; challenge?: string; setIds: string[]; teacher: boolean; kiki?: 'left' | 'right'; notice?: string }
const views = new Set<View>(['home', 'module', 'lesson', 'stamps', 'settings', 'labs', 'teacher', 'challenges', 'challenge', 'compare', 'help']);
export function readRoute(url: URL, knownIds: readonly string[]): Route {
  const params = url.searchParams;
  const requested = params.get('view') as View | null;
  const route: Route = { view: requested && views.has(requested) ? requested : 'home', setIds: [], teacher: params.get('mode') === 'teacher' };
  if (['left', 'right'].includes(params.get('kiki') ?? '')) route.kiki = params.get('kiki') as 'left' | 'right';
  const lesson = params.get('lesson');
  const known = new Set(knownIds);
  if (params.has('set')) {
    const requestedIds = (params.get('set') ?? '').split(',').map(id => id.trim()).filter(Boolean).slice(0, 69);
    route.setIds = [...new Set(requestedIds)].filter(id => known.has(id));
    if (requestedIds.some(id => !known.has(id))) route.notice = '見つからない教材を、授業セットからはずしました。';
    if (route.setIds.length) { route.lessonId = lesson && route.setIds.includes(lesson) ? lesson : route.setIds[0]; route.view = 'lesson'; }
    else { route.view = 'home'; route.notice = 'この授業セットには、ひらける教材がありません。ホームからえらんでね。'; }
  } else if (lesson) {
    if (known.has(lesson)) { route.lessonId = lesson; route.view = 'lesson'; }
    else { route.view = 'home'; route.notice = 'この教材は見つかりませんでした。ホームからえらんでね。'; }
  } else if (route.view === 'lesson') { route.view = 'home'; }
  route.module = params.get('module') ?? undefined;
  route.challenge = params.get('challenge') ?? undefined;
  return route;
}
export function routeURL(route: Route, source = new URL(location.href)): URL {
  const url = new URL(source.href); url.search = ''; url.hash = '';
  if (route.view !== 'home' && route.view !== 'lesson') url.searchParams.set('view', route.view);
  if (route.lessonId && route.view === 'lesson') url.searchParams.set('lesson', route.lessonId);
  if (route.module && route.view === 'module') url.searchParams.set('module', route.module);
  if (route.challenge && route.view === 'challenge') url.searchParams.set('challenge', route.challenge);
  if (route.setIds.length && route.view === 'lesson') url.searchParams.set('set', route.setIds.join(','));
  if (route.teacher) url.searchParams.set('mode', 'teacher');
  if (route.kiki) url.searchParams.set('kiki', route.kiki);
  return url;
}
