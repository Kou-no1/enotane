import { describe, expect, it } from 'vitest';
import { readRoute, routeURL } from '../src/app/routes';

const ids = ['P-02', 'C-09', 'W-11'];
describe('教材URL', () => {
  it('授業セットは順序を保ち、重複と未知IDを除き、有効なlessonから開く', () => {
    const route = readRoute(new URL('https://example.com/tools/enotane/?set=W-11,P-02,W-11,unknown,C-09&lesson=P-02&mode=teacher&kiki=left'), ids);
    expect(route.setIds).toEqual(['W-11', 'P-02', 'C-09']); expect(route.lessonId).toBe('P-02'); expect(route.teacher).toBe(true); expect(route.kiki).toBe('left'); expect(route.notice).toBeTruthy();
  });
  it('セット内にないlessonより、最初の有効IDを優先する', () => {
    expect(readRoute(new URL('https://example.com/?set=C-09,W-11&lesson=P-02'), ids).lessonId).toBe('C-09');
  });
  it('空・全件無効のセットと無効なlessonは説明付きでホームに戻す', () => {
    for (const query of ['?set=', '?set=X-99', '?lesson=X-99', '?set=X-99&lesson=P-02']) {
      const route = readRoute(new URL(`https://example.com/${query}`), ids); expect(route.view).toBe('home'); expect(route.notice).toBeTruthy();
    }
  });
  it('未知のモードと利き手は設定に採用しない', () => {
    const route = readRoute(new URL('https://example.com/?mode=invalid&kiki=invalid&secret=value'), ids); expect(route.teacher).toBe(false); expect(route.kiki).toBeUndefined();
  });
  it('URL生成は配置パスを保ち、記録や未知パラメータを含めない', () => {
    const route = readRoute(new URL('https://example.com/tools/enotane/?set=W-11,P-02&mode=teacher&kiki=left'), ids);
    const target = routeURL(route, new URL('https://example.com/tools/enotane/?name=private#old'));
    expect(target.pathname).toBe('/tools/enotane/'); expect(target.searchParams.get('set')).toBe('W-11,P-02'); expect(target.searchParams.get('name')).toBeNull(); expect(target.hash).toBe('');
  });
});
