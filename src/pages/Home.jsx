import homeStyles from "../styles/home.module.css";
import { bindStyles } from "../utils/bindStyles";
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import Navbar from "../components/layout/Navbar";

import UserSearch from "../components/users/UserSearch";

import { useAuth } from "../auth/AuthContext";

const css = bindStyles(homeStyles);

const Home = () => {
  const { user } = useAuth();

  return (
    <>
      <Navbar />

      <PageContainer className={css("home-page")}>
        <Card as="section" className={css("welcome-section")}>
          <h1>Welcome to FrndBook</h1>

          <p>Hello, {user?.name}</p>

          <p>{user?.email}</p>
        </Card>

        <UserSearch />
      </PageContainer>
    </>
  );
};

export default Home;
