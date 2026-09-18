import './404.css'

function Page404() {
  const handleGoBack = () => {
    window.history.back()
  }

  return (
    <main className="notfound">
      <div className="error-code">404</div>
      <h1>Page Not Found</h1>
      <p className="message">
        Sorry, couldn't find the page you are looking for. It might have been
        moved or doesn't exist.
      </p>
      <div className="actions">
        <a href="/" className="home-button">
          Go Home
        </a>
        <button type="button" onClick={handleGoBack} className="back-button">
          Go Back
        </button>
      </div>
    </main>
  )
}

export default Page404