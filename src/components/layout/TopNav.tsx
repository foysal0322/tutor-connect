'use client';

import React from 'react';
import { Menu, Search, Moon, Sun } from 'lucide-react';
import NotificationBell from '../NotificationBell';
import styles from './layout.module.css';

type TopNavProps = {
  onMenuClick: () => void;
  userName?: string | null;
  role: string;
};

export default function TopNav({ onMenuClick, userName, role }: TopNavProps) {
  // Simple initials for avatar
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <header className={styles.topNav}>
      <div className={styles.topNavLeft}>
        <button className={styles.menuToggle} onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        
        <div className={styles.searchBar}>
          <Search size={18} className="text-muted" />
          <input 
            type="text" 
            placeholder="Search..." 
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.topNavRight}>
        <button className="btn-icon" title="Toggle Theme (Coming Soon)">
          <Moon size={20} />
        </button>
        
        <NotificationBell />

        <div className="flex items-center gap-3 ml-2 pl-4" style={{ borderLeft: '1px solid var(--border-color)' }}>
          <div className="flex-col text-right hidden md:flex" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
            <span className="text-sm font-semibold" style={{ lineHeight: 1.2 }}>{userName || 'User'}</span>
            <span className="text-xs text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{role}</span>
          </div>
          <div className={styles.avatar}>
            {getInitials(userName)}
          </div>
        </div>
      </div>
    </header>
  );
}
