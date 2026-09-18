function Home() {
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Home</h1>
      <p>This is the default route page for unmatched URLs.</p>
      <p>Route details:</p>
      <ul>
        <li><a href="/login">/login</a></li>
        <li><a href="/worker-dashboard">/worker-dashboard</a></li>
        <li>/signup</li>
        <li>/forgot-password</li>
        <li>/404</li>
        <li>* (fallback for any unknown page)</li>
      </ul>
    </div>
  )
}
export default Home
