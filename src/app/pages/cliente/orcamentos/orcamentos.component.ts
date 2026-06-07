import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-client-orcamentos',
  standalone: true,
  template: `
    <h1 class="display text-2xl md:text-3xl font-semibold text-ink m-0">
      Listagem de Orçamentos Lactec
    </h1>
    <p class="text-muted text-sm mt-2">
      Acompanhe o andamento das propostas e ensaios contratados.
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientOrcamentosComponent {}
