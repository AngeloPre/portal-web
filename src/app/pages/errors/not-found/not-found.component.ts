import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
    <main class="min-h-svh grid place-items-center bg-bg px-6">
      <div class="text-center max-w-md">
        <p class="display text-6xl font-semibold text-nav leading-none m-0">404</p>
        <h1 class="display text-2xl md:text-3xl font-semibold text-ink mt-4 mb-2">
          Página não encontrada
        </h1>
        <p class="text-muted text-sm m-0">O endereço acessado não existe ou foi movido.</p>
        <a mat-flat-button color="primary" routerLink="/" class="mt-6">Voltar ao início</a>
      </div>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {}
