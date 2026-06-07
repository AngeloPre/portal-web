import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-client-relatorios',
  standalone: true,
  template: `
    <h1 class="display text-2xl md:text-3xl font-semibold text-ink m-0">Relatórios</h1>
    <p class="text-muted text-sm mt-2">HU-04 — em construção.</p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientRelatoriosComponent {}
