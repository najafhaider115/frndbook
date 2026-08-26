import Navbar from "../components/layout/Navbar";

import UserSearch from "../components/users/UserSearch";

import { useAuth } from "../auth/AuthContext";

const Home = () => {
  const { user } = useAuth();

  return (
    <>
      <Navbar />

      <main className="home-page">
        <section className="welcome-section">
          <h1>Welcome to FrndBook</h1>

          <p>Hello, {user?.name}</p>

          <p>{user?.email}</p>
        </section>

        <UserSearch />
      </main>
    </>
  );
};

export default Home;
