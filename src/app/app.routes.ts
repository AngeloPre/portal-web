import { Routes } from '@angular/router';

import { authGuard } from '@core/guards/auth.guard';

import { CLIENT_ROLE } from '@/app/model/roles';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  {
    path: '',
    loadComponent: () =>
      import('@/app/layouts/wrapper-auth/wrapper-auth.component').then(
        (m) => m.WrapperAuthComponent,
      ),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('@/app/pages/login/login.component').then((m) => m.LoginComponent),
        title: 'Acessar — Portal Lactec',
      },
    ],
  },

  {
    path: 'cliente',
    loadComponent: () =>
      import('@/app/layouts/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    data: { role: CLIENT_ROLE },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'orcamentos' },
      {
        path: 'orcamentos',
        loadComponent: () =>
          import('@/app/pages/cliente/orcamentos/orcamentos.component').then(
            (m) => m.ClientOrcamentosComponent,
          ),
        title: 'Orçamentos — Portal Lactec',
      },
      {
        path: 'relatorios',
        loadComponent: () =>
          import('@/app/pages/cliente/relatorios/relatorios.component').then(
            (m) => m.ClientRelatoriosComponent,
          ),
        title: 'Relatórios — Portal Lactec',
      },
      {
        path: 'equipamentos',
        loadComponent: () =>
          import('@/app/pages/cliente/equipamentos/equipamentos.component').then(
            (m) => m.ClientEquipamentosComponent,
          ),
        title: 'Equipamentos — Portal Lactec',
      },
    ],
  },

  {
    path: '404',
    loadComponent: () =>
      import('@/app/pages/errors/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Página não encontrada — Portal Lactec',
  },
  { path: '**', redirectTo: '404' },
];
