'use client';

import { useEffect, useState } from 'react';
import NicknameModal from '@/components/NicknameModal';
import GameCard from '@/components/GameCard';
import { getPlayCount } from '@/lib/logger';
import Link from 'next/link';

function CalendarWidget() {
  const [today] = useState(() => new Date());
  
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDate = today.getDate();

  const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const dayNames = ['일','월','화','수','목','금','토'];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const events = [
    { date: '12/13', title: '전사 워크샵 참가 후기 작성 마감', href: '/notices/1' },
    { date: '12/18', title: '신규 도구 베타테스터 모집 공고', href: '/notices/2' },
    { date: '12/23', title: '2024 연말 행사 참여 신청', href: '/notices/3' },
  ];

  return (
    <div className="bg-white border border-gray-300 shadow-sm">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <h4 className="text-xs font-bold text-gray-700">📅 팀 캘린더</h4>
        <span className="text-xs text-gray-500">{year}년 {monthNames[month]}</span>
      </div>
      <div className="px-3 pt-2 pb-1">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {dayNames.map((d, i) => (
            <div key={d} className={`text-center font-medium pb-0.5 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-600' : 'text-gray-500'}`} style={{ fontSize: 10 }}>
              {d}
            </div>
          ))}
        </div>
        {/* Date cells */}
        {Array.from({ length: cells.length / 7 }, (_, week) => (
          <div key={week} className="grid grid-cols-7">
            {cells.slice(week * 7, week * 7 + 7).map((d, i) => {
              const isToday = d === todayDate;
              const hasEvent = d !== null && events.some(e => {
                const [em, ed] = e.date.split('/').map(Number);
                return em === month + 1 && ed === d;
              });
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center py-0.5 rounded ${isToday ? 'bg-blue-600 text-white' : d ? 'hover:bg-gray-100 cursor-default' : ''}`}
                >
                  {d !== null && (
                    <>
                      <span
                        className={`leading-none ${isToday ? 'text-white font-bold' : i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-600' : 'text-gray-700'}`}
                        style={{ fontSize: 10 }}
                      >
                        {d}
                      </span>
                      {hasEvent && (
                        <div className={`w-1 h-1 rounded-full mt-0.5 ${isToday ? 'bg-white' : 'bg-blue-500'}`} />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* Events list */}
      <div className="border-t border-gray-100 px-3 py-2">
        <div className="text-gray-500 font-medium mb-1.5" style={{ fontSize: 10 }}>예정된 일정</div>
        <div className="space-y-1">
          {events.map((ev, i) => (
            <Link
              key={i}
              href={ev.href}
              className="flex items-start gap-1.5 hover:bg-blue-50 rounded px-1 py-0.5 group"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
              <div>
                <span className="text-blue-700 font-medium group-hover:underline" style={{ fontSize: 10 }}>[{ev.date}]</span>
                <span className="text-gray-600 ml-1 group-hover:text-blue-600" style={{ fontSize: 10 }}>{ev.title}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function IntranetHub() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('acme_nickname');
    if (stored) {
      setNickname(stored);
    } else {
      setShowModal(true);
    }
  }, []);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      const [sudoku, tetris, mystery, messenger] = await Promise.all([
        getPlayCount('sudoku'),
        getPlayCount('tetris'),
        getPlayCount('mystery'),
        getPlayCount('messenger'),
      ]);
      setPlayCounts({ sudoku, tetris, mystery, messenger });
    };
    fetchCounts();
  }, []);

  const handleConfirm = (name: string) => {
    localStorage.setItem('acme_nickname', name);
    setNickname(name);
    setShowModal(false);
  };

  const games = [
    {
      id: 'sudoku',
      title: '데이터 분석 도구 v2.3',
      description: '엑셀 기반 데이터 분석 및 수식 검증 도구입니다. 복잡한 셀 관계를 시각적으로 확인하세요.',
      icon: '📊',
      href: '/games/sudoku',
      version: 'Excel Analysis Suite 2.3.1',
      category: '데이터 관리',
    },
    {
      id: 'tetris',
      title: '업무 현황판',
      description: '팀 KPI 및 분기별 업무 현황을 실시간으로 확인합니다. Q4 목표 달성률을 모니터링하세요.',
      icon: '📈',
      href: '/games/tetris',
      version: 'Sheets Dashboard 3.1.0',
      category: '업무 현황',
    },
    {
      id: 'mystery',
      title: '코드 리뷰어',
      description: '팀 코드베이스를 검토하고 이슈를 추적합니다. 최근 배포된 코드의 이상 동작을 분석하세요.',
      icon: '💻',
      href: '/games/mystery',
      version: 'VS Code Review 1.84.0',
      category: '개발 도구',
    },
    {
      id: 'coming1',
      title: '회의실 예약 시스템',
      description: '회의실 예약 및 화상 회의 연결 통합 도구입니다.',
      icon: '📅',
      href: '#',
      version: 'Booking System 1.0.0',
      category: '업무 지원',
      comingSoon: true,
    },
    {
      id: 'coming2',
      title: '급여 명세 조회',
      description: '월별 급여 명세서 및 연말정산 서류를 확인합니다.',
      icon: '💰',
      href: '#',
      version: 'HR Portal 2.0.1',
      category: '인사/급여',
      comingSoon: true,
    },
    {
      id: 'messenger',
      title: '사내 메신저',
      description: '팀원들과 실시간으로 소통하는 사내 메신저입니다. 대화는 48시간 후 자동 삭제됩니다.',
      icon: '💬',
      href: '/games/messenger',
      version: 'AcmeChat v4.2',
      category: '커뮤니케이션',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col text-sm">
      {showModal && <NicknameModal onConfirm={handleConfirm} />}

      {/* Top Navigation */}
      <header className="bg-blue-900 text-white shadow-md">
        <div className="flex items-center justify-between px-4 py-0 h-10 border-b border-blue-700">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 text-blue-900 font-black text-xs px-2 py-1 tracking-wider">
              ACME
            </div>
            <span className="text-white text-xs font-medium opacity-80 hidden sm:block">
              Corporation Internal Portal
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-xs">
            {['홈', '공지사항', '전자결재', '인사정보', '복리후생', '고객지원'].map((item) => (
              <button
                key={item}
                className="px-3 py-2.5 hover:bg-blue-800 transition-colors opacity-80 hover:opacity-100"
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 text-xs">
            {nickname && (
              <span className="opacity-80">👤 {nickname} 님</span>
            )}
            <button
              className="opacity-60 hover:opacity-100 transition-opacity"
              onClick={() => {
                localStorage.removeItem('acme_nickname');
                setNickname(null);
                setShowModal(true);
              }}
            >
              로그아웃
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 px-4 py-1 bg-blue-800 text-xs">
          <span className="opacity-60">현재 위치:</span>
          <span className="opacity-80">홈</span>
          <span className="opacity-40 mx-1">&gt;</span>
          <span className="text-yellow-300">업무 도구함</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
        {/* Welcome banner */}
        <div className="bg-white border border-gray-300 mb-4 shadow-sm">
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-blue-900">📋 업무 도구 현황판</h2>
            <span className="text-xs text-gray-500 font-mono">{currentTime}</span>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-600">
              안녕하세요{nickname ? `, ${nickname} 님` : ''}. 오늘도 활기찬 하루 되세요. 현재 <strong>4개</strong>의 업무 도구가 사용 가능합니다.
              IT 팀에서 새로운 도구를 지속적으로 추가하고 있습니다.
            </p>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>🟢 시스템 정상 운영 중</span>
              <span>|</span>
              <span>📌 공지: 이번 주 금요일 서버 점검 예정 (18:00~22:00)</span>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          {[
            { label: '접속자 수', value: '24', unit: '명' },
            { label: '처리 건수', value: '1,847', unit: '건' },
            { label: '완료율', value: '94.2', unit: '%' },
            { label: '평균 처리시간', value: '3.2', unit: '분' },
            { label: '미결 이슈', value: '7', unit: '개' },
            { label: '서버 가동률', value: '99.8', unit: '%' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-gray-200 px-3 py-2">
              <div className="text-xs text-gray-500">{stat.label}</div>
              <div className="font-bold text-blue-800 text-base leading-tight">
                {stat.value}<span className="text-xs font-normal text-gray-500 ml-0.5">{stat.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tool grid */}
        <div className="bg-white border border-gray-300 shadow-sm">
          <div className="bg-gray-50 border-b border-gray-300 px-4 py-2">
            <h3 className="text-sm font-bold text-gray-700">사용 가능한 업무 도구</h3>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {games.map((game) => (
              <GameCard
                key={game.id}
                title={game.title}
                description={game.description}
                icon={game.icon}
                href={game.href}
                version={game.version}
                playCount={playCounts[game.id] || 0}
                comingSoon={game.comingSoon}
                category={game.category}
              />
            ))}
          </div>
        </div>

        {/* Bottom info — 3 columns */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Announcements */}
          <div className="bg-white border border-gray-300 shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
              <h4 className="text-xs font-bold text-gray-700">📢 최근 공지사항</h4>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { date: '2024-12-09', title: '[필독] 연말 재고 집계 일정 안내', badge: '중요' },
                { date: '2024-12-06', title: 'Q4 성과 평가 입력 마감 (12/15)', badge: '인사' },
                { date: '2024-12-04', title: '사내 Wi-Fi 비밀번호 변경 안내', badge: 'IT' },
                { date: '2024-12-01', title: '12월 전사 회의 일정 공지', badge: '일반' },
              ].map((item) => (
                <div key={item.date} className="px-4 py-2 flex items-center gap-2 hover:bg-gray-50 cursor-pointer">
                  <span className={`text-xs px-1.5 py-0.5 flex-shrink-0 ${
                    item.badge === '중요' ? 'bg-red-100 text-red-700' :
                    item.badge === 'IT' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{item.badge}</span>
                  <span className="text-xs text-gray-700 truncate">{item.title}</span>
                  <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{item.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white border border-gray-300 shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
              <h4 className="text-xs font-bold text-gray-700">🔔 최근 활동</h4>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { time: '방금 전', text: '신규 사용자가 포털에 접속했습니다.' },
                { time: '5분 전', text: '데이터 분석 도구에서 작업이 완료되었습니다.' },
                { time: '12분 전', text: '업무 현황판이 업데이트되었습니다.' },
                { time: '23분 전', text: '코드 리뷰어에서 이슈가 감지되었습니다.' },
              ].map((act, i) => (
                <div key={i} className="px-4 py-2 flex items-start gap-2">
                  <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5 w-16">{act.time}</span>
                  <span className="text-xs text-gray-600">{act.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar widget */}
          <CalendarWidget />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-200 border-t border-gray-300 px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
        <span>© 2024 ACME Corporation. All rights reserved. | 인트라넷 포털 v2.4.1</span>
        <span>IT 지원: it-helpdesk@acme.co.kr | ☎ 내선 1000</span>
      </footer>
    </div>
  );
}
