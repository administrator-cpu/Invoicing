const sendEmail = async ({ email, subject, message }) => {
  const payload = {
    service_id: process.env.EMAILJS_SERVICE_ID,
    template_id: process.env.EMAILJS_TEMPLATE_ID,
    user_id: process.env.EMAILJS_PUBLIC_KEY,
    accessToken: process.env.EMAILJS_PRIVATE_KEY,
    template_params: {
      to_email: email,
      subject: subject,
      html_content: message
    }
  };

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', { 
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('EmailJS Error:', errorData);
    throw new Error('Failed to send email via EmailJS');
  }

  return true;
};

export default sendEmail;