import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Landing from './Landing'

describe('Landing', () => {
  it('mostra tots els jocs i hi navega', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/trivial" element={<p>pantalla trivial</p>} />
        </Routes>
      </MemoryRouter>
    )
    for (const name of ['Hitster', 'Bingo Musical', 'Trivial Party', 'Karaoke']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
    fireEvent.click(screen.getByText('Trivial Party'))
    expect(screen.getByText('pantalla trivial')).toBeInTheDocument()
  })
})
