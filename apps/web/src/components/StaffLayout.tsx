import type { PublicUser } from '@starter/shared';
import type { ReactNode } from 'react';
import type { StaffPage } from '../model';
import { ArawIcon, Brand, Button } from './ui';

const navItems: { page: StaffPage; label: string; icon: string }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: 'dashboard-grid' },
  { page: 'profiles', label: 'Child Profiles', icon: 'child-profiles' },
  { page: 'schedules', label: 'Schedules', icon: 'schedules-calendar' },
  { page: 'progress', label: 'Progress', icon: 'progress-bars' },
  { page: 'settings', label: 'Settings', icon: 'settings-gear' },
];

function roleLabel(role: PublicUser['role']) {
  return role === 'caregiver' ? 'Caregiver' : role === 'ot' ? 'OT' : 'SPED Teacher';
}

export function StaffLayout({
  user, page, menuOpen, onMenuToggle, onNavigate, onLogout, children,
}: {
  user: PublicUser;
  page: StaffPage;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onNavigate: (page: StaffPage) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  return <div className="staff-workspace">
    <nav id="staff-navigation" className={`staff-nav ${menuOpen ? 'open' : ''}`} aria-label="Staff navigation">
      <div className="staff-nav-brand"><Brand /></div>
      <div className="staff-nav-items">
        {navItems.map((item) => {
          const active = page === item.page || (item.page === 'schedules' && page === 'tasks');
          return <button type="button" className={`staff-nav-link ${active ? 'active' : ''}`} key={item.page} aria-current={active ? 'page' : undefined} onClick={() => onNavigate(item.page)}>
            <span className="staff-nav-icon"><ArawIcon name={item.icon} /></span><span>{item.label}</span>
          </button>;
        })}
        <Button className="staff-nav-logout" variant="outline" leadingIcon="logout" onClick={onLogout}>Log out</Button>
      </div>
    </nav>
    <div className="staff-layout">
    <header className="staff-header">
      <div className="staff-mobile-brand"><Brand /></div>
      <span className="staff-workspace-label">Staff workspace</span>
      <div className="staff-account" aria-label={`${user.name}, ${roleLabel(user.role)}`}>
        <img src="/araw/avatars/avatar-caregiver.svg" alt="" aria-hidden="true" />
        <span className="staff-account__details"><strong>{user.name}</strong><span>{roleLabel(user.role)}</span></span>
      </div>
      <Button className="staff-logout" variant="outline" leadingIcon="logout" onClick={onLogout}>Log out</Button>
      <Button className="staff-menu-button" variant="outline" aria-expanded={menuOpen} aria-controls="staff-navigation" onClick={onMenuToggle}>{menuOpen ? 'Close' : 'Menu'}</Button>
    </header>
      <main className="staff-main">{children}</main>
    </div>
  </div>;
}
