import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Landing from './landing/Landing'
import HitsterHome from './games/hitster/pages/Home'
import HitsterHost from './games/hitster/pages/Host'
import HitsterJoin from './games/hitster/pages/Join'
import HitsterPlayer from './games/hitster/pages/Player'
import HitsterCallback from './games/hitster/pages/Callback'
import BingoHome from './games/bingo/pages/Home'
import BingoHost from './games/bingo/pages/Host'
import BingoJoin from './games/bingo/pages/Join'
import BingoPlay from './games/bingo/pages/Play'
import BingoPrint from './games/bingo/pages/Print'
import TrivialHome from './games/trivial/pages/Home'
import TrivialHost from './games/trivial/pages/Host'
import TrivialJoin from './games/trivial/pages/Join'
import TrivialPlay from './games/trivial/pages/Play'
import Karaoke from './games/karaoke/Karaoke'

// Router principal: la pàgina inicial tria el joc; cada joc té el seu prefix i
// els seus propis estils.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* HITSTER */}
        <Route path="/hitster" element={<HitsterHome />} />
        <Route path="/hitster/host/:code" element={<HitsterHost />} />
        <Route path="/hitster/join/:code" element={<HitsterJoin />} />
        <Route path="/hitster/play/:code" element={<HitsterPlayer />} />
        {/* Redirect URI de Spotify (registrat com a /callback) */}
        <Route path="/callback" element={<HitsterCallback />} />

        {/* BINGO MUSICAL */}
        <Route path="/bingo" element={<BingoHome />} />
        <Route path="/bingo/host/:code" element={<BingoHost />} />
        <Route path="/bingo/join/:code" element={<BingoJoin />} />
        <Route path="/bingo/play/:code" element={<BingoPlay />} />
        <Route path="/bingo/print/:code" element={<BingoPrint />} />

        {/* TRIVIAL PARTY */}
        <Route path="/trivial" element={<TrivialHome />} />
        <Route path="/trivial/host/:code" element={<TrivialHost />} />
        <Route path="/trivial/join/:code" element={<TrivialJoin />} />
        <Route path="/trivial/play/:code" element={<TrivialPlay />} />

        {/* KARAOKE */}
        <Route path="/karaoke" element={<Karaoke />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
