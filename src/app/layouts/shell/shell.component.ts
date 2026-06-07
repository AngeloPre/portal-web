import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { LogoComponent } from '@shared/components/logo/logo.component';

import { LoginService } from '@/app/services/login.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  exact: boolean;
}

interface SecondaryAction {
  label: string;
  icon: string;
  action: 'help' | 'profile';
}

const COLLAPSED_KEY = 'lactec.shell.collapsed';

function loadCollapsed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(COLLAPSED_KEY) === '1';
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    LogoComponent,
  ],
  templateUrl: './shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly loginService = inject(LoginService);

  readonly collapsed = signal(loadCollapsed());

  readonly nav: readonly NavItem[] = [
    { label: 'Orçamentos', path: '/cliente/orcamentos', icon: 'description', exact: false },
    { label: 'Relatórios', path: '/cliente/relatorios', icon: 'science', exact: false },
    { label: 'Equipamentos', path: '/cliente/equipamentos', icon: 'settings', exact: false },
  ];

  readonly bottomActions: readonly SecondaryAction[] = [
    { label: 'Ajuda', icon: 'help_outline', action: 'help' },
    { label: 'Perfil', icon: 'person_outline', action: 'profile' },
  ];

  constructor() {
    effect(() => {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(COLLAPSED_KEY, this.collapsed() ? '1' : '0');
    });
  }

  toggleCollapse(): void {
    this.collapsed.update((v) => !v);
  }

  onSecondaryAction(action: SecondaryAction['action']): void {
    void action;
  }

  logout(): void {
    this.loginService.logout();
    this.router.navigateByUrl('/login');
  }
}
