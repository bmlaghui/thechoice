import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../favorites.service';

@Component({
  selector: 'app-favorites-modal',
  imports: [RouterLink],
  host: { '(document:keydown.escape)': 'close()' },
  templateUrl: './favorites-modal.html',
  styleUrl: './favorites-modal.scss',
})
export class FavoritesModal {
  protected readonly favorites = inject(FavoritesService);
  protected close(): void { this.favorites.modalOpen.set(false); }
}
