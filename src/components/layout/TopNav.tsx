'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import styles from './layout.module.css';

type TopNavProps = {
  onMenuClick: () => void;
};

export default function TopNav({ onMenuClick }: TopNavProps) {
  return (
    <header className={styles.topNav}>
      <div className={styles.topNavLeft}>
        <button className={styles.menuToggle} onClick={onMenuClick} aria-label="Open sidebar">
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
}
