import UserList from './components/UserList';

function App() {
  return (
    <div className="container mx-auto p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold">
          Monopereo
        </h1>
        <p className="text-xl text-gray-600">A FastAPI + React Demo</p>
      </header>
      <main>
        <UserList />
      </main>
    </div>
  )
}

export default App
