import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: '#FBF7F0', color: '#332F2B' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b" style={{ background: 'rgba(251,247,240,0.95)', borderColor: 'rgba(44,40,37,0.08)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium transition-colors duration-200"
            style={{ color: '#94908A' }}
            onMouseEnter={e => e.currentTarget.style.color = '#C45D3E'}
            onMouseLeave={e => e.currentTarget.style.color = '#94908A'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>
          <span className="text-xs font-bold tracking-widest" style={{ color: '#C45D3E' }}>OVERLOAD</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 pb-24">
        <h1 className="text-4xl font-light mb-2" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
          Privacy Policy
        </h1>
        <p className="text-sm mb-10" style={{ color: '#94908A' }}>
          Last updated: January 1, 2025
        </p>

        <div className="space-y-10 text-[15px] leading-relaxed" style={{ color: '#4A4540' }}>
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              1. Introduction
            </h2>
            <p>
              [Your Company Name] ("we," "our," or "us") operates the Overload marketing platform (the "Service").
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you
              use our Service. By accessing or using the Service, you agree to the collection and use of information
              in accordance with this policy. If you do not agree, please discontinue use of the Service.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              2. Information We Collect
            </h2>

            <h3 className="text-base font-semibold mt-4 mb-2" style={{ color: '#332F2B' }}>2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, password, and optional profile details such as your avatar.</li>
              <li><strong>Workspace Data:</strong> Information you provide when creating and managing workspaces, including workspace names, team member invitations, and role assignments.</li>
              <li><strong>Content and Marketing Data:</strong> Any content you create, upload, or manage through the platform, including marketing campaigns, ad creatives, email templates, social media posts, product feeds, analytics configurations, and customer relationship data.</li>
              <li><strong>Payment Information:</strong> If you purchase a paid subscription, we collect billing details such as your name, billing address, and payment card information. Payment processing is handled by our third-party payment processor, and we do not store full credit card numbers on our servers.</li>
              <li><strong>Communications:</strong> When you contact our support team, submit feedback, or participate in surveys, we collect the information you provide in those communications.</li>
            </ul>

            <h3 className="text-base font-semibold mt-4 mb-2" style={{ color: '#332F2B' }}>2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Usage Data:</strong> We collect information about how you interact with the Service, including pages visited, features used, actions taken, timestamps, and session duration.</li>
              <li><strong>Device and Browser Information:</strong> We collect your IP address, browser type and version, operating system, device type, screen resolution, and language preference.</li>
              <li><strong>Log Data:</strong> Our servers automatically record information including your IP address, access times, pages viewed, referring URLs, and system activity.</li>
              <li><strong>Cookies and Tracking Technologies:</strong> We use cookies, web beacons, and similar technologies to collect information about your browsing activity. See Section 6 for more details.</li>
            </ul>

            <h3 className="text-base font-semibold mt-4 mb-2" style={{ color: '#332F2B' }}>2.3 Information from Third Parties</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Third-Party Integrations:</strong> When you connect third-party services (such as Google Ads, Facebook, email providers, CRM systems, or analytics platforms), we may receive data from those services according to the permissions you grant.</li>
              <li><strong>Social Sign-In:</strong> If you sign in using a social media account, we may receive your profile information from that provider.</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              3. How We Use Your Information
            </h2>
            <p className="mb-3">We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Provide and Maintain the Service:</strong> To operate, maintain, and improve the platform, including processing your marketing campaigns, generating analytics, and delivering AI-powered insights.</li>
              <li><strong>Account Management:</strong> To create and manage your account, authenticate your identity, and manage workspace access and team permissions.</li>
              <li><strong>Personalization:</strong> To customize your experience, provide tailored content recommendations, and optimize your marketing workflows.</li>
              <li><strong>Communication:</strong> To send you service-related notifications, respond to your inquiries, provide customer support, and send marketing communications (with your consent).</li>
              <li><strong>Analytics and Improvement:</strong> To analyze usage patterns, monitor performance, diagnose technical issues, and improve the Service.</li>
              <li><strong>Security:</strong> To detect, prevent, and address fraud, unauthorized access, and other illegal activities.</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes.</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              4. How We Share Your Information
            </h2>
            <p className="mb-3">We do not sell your personal information. We may share your information in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service Providers:</strong> We share data with trusted third-party vendors who assist us in operating the Service, such as hosting providers, payment processors, email delivery services, and analytics providers. These providers are contractually obligated to use your data only for the purposes we specify.</li>
              <li><strong>Third-Party Integrations:</strong> When you enable integrations with third-party services (e.g., Google Ads, Facebook Ads, Mailchimp), data may be shared with those platforms as necessary to provide the integration functionality.</li>
              <li><strong>Workspace Members:</strong> Information within a workspace is accessible to other members of that workspace according to their assigned roles and permissions.</li>
              <li><strong>Legal Requirements:</strong> We may disclose your information if required by law, regulation, legal process, or governmental request, or to protect the rights, property, or safety of [Your Company Name], our users, or others.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, reorganization, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change and any choices you may have regarding your information.</li>
              <li><strong>With Your Consent:</strong> We may share your information for other purposes with your explicit consent.</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              5. Data Retention
            </h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide the Service.
              We may also retain certain information as necessary to comply with legal obligations, resolve disputes,
              enforce our agreements, and for legitimate business purposes. When you delete your account, we will delete
              or anonymize your personal information within 30 days, except where retention is required by law.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              6. Cookies and Tracking Technologies
            </h2>
            <p className="mb-3">We use the following types of cookies and similar technologies:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for the Service to function properly. These include session cookies for authentication and security tokens. You cannot opt out of these cookies.</li>
              <li><strong>Functional Cookies:</strong> Used to remember your preferences, settings, and customizations (such as theme preferences and workspace selections).</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the Service by collecting usage statistics. We may use third-party analytics providers such as Google Analytics.</li>
              <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements and track the effectiveness of marketing campaigns. These may be set by third-party advertising partners.</li>
            </ul>
            <p className="mt-3">
              You can manage your cookie preferences through the cookie consent banner displayed when you first visit the Service,
              or through your browser settings. Note that disabling certain cookies may limit the functionality of the Service.
            </p>
          </section>

          {/* Third-Party Integrations */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              7. Third-Party Services and Integrations
            </h2>
            <p>
              The Service allows you to connect and integrate with various third-party platforms, including but not limited to
              advertising networks (Google Ads, Meta/Facebook Ads), social media platforms, email marketing services,
              CRM systems, analytics providers, and e-commerce platforms. When you enable these integrations, you authorize
              us to access and exchange data with these services on your behalf. Each third-party service has its own privacy
              policy, and we encourage you to review their practices. We are not responsible for the privacy practices of
              third-party services.
            </p>
          </section>

          {/* AI and Automated Processing */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              8. AI and Automated Processing
            </h2>
            <p>
              Our Service uses artificial intelligence and machine learning to provide features such as content generation,
              marketing recommendations, audience insights, automated campaign optimization, and predictive analytics.
              Your data may be processed by AI systems to deliver these features. We do not use your content data to train
              general-purpose AI models without your explicit consent. You may opt out of certain AI-powered features
              through your account settings.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              9. Your Rights and Choices
            </h2>
            <p className="mb-3">Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> You have the right to request a copy of the personal data we hold about you. You can export your data at any time through the platform's data export feature.</li>
              <li><strong>Correction:</strong> You have the right to request correction of any inaccurate or incomplete personal data.</li>
              <li><strong>Deletion:</strong> You have the right to request deletion of your personal data. You can delete your account through the platform, which will remove your data in accordance with our retention policy.</li>
              <li><strong>Portability:</strong> You have the right to receive your personal data in a structured, commonly used, and machine-readable format.</li>
              <li><strong>Restriction:</strong> You have the right to request that we restrict the processing of your personal data under certain circumstances.</li>
              <li><strong>Objection:</strong> You have the right to object to the processing of your personal data for certain purposes, including direct marketing.</li>
              <li><strong>Withdraw Consent:</strong> Where processing is based on consent, you have the right to withdraw your consent at any time.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at <a href="mailto:privacy@yourdomain.com" className="underline" style={{ color: '#C45D3E' }}>[privacy@yourdomain.com]</a> or
              use the self-service tools available in your account settings.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              10. Data Security
            </h2>
            <p>
              We implement industry-standard technical and organizational security measures to protect your personal data
              against unauthorized access, alteration, disclosure, or destruction. These measures include encryption of data
              in transit (TLS/SSL) and at rest, secure authentication mechanisms, regular security audits, access controls,
              and employee training. However, no method of electronic storage or transmission over the internet is 100% secure,
              and we cannot guarantee absolute security.
            </p>
          </section>

          {/* International Transfers */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              11. International Data Transfers
            </h2>
            <p>
              Your information may be transferred to and processed in countries other than the country in which you reside.
              These countries may have different data protection laws. When we transfer data internationally, we implement
              appropriate safeguards, such as Standard Contractual Clauses approved by the European Commission, to ensure
              your data is protected in accordance with this Privacy Policy and applicable law.
            </p>
          </section>

          {/* Children */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              12. Children's Privacy
            </h2>
            <p>
              The Service is not intended for individuals under the age of 16. We do not knowingly collect personal
              information from children under 16. If we become aware that we have collected personal data from a child
              under 16, we will take steps to delete that information promptly. If you believe we may have collected
              information from a child under 16, please contact us at <a href="mailto:privacy@yourdomain.com" className="underline" style={{ color: '#C45D3E' }}>[privacy@yourdomain.com]</a>.
            </p>
          </section>

          {/* CCPA */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              13. California Privacy Rights (CCPA)
            </h2>
            <p>
              If you are a California resident, you have the right to: (a) know what personal information is being collected
              about you; (b) know whether your personal information is sold or disclosed and to whom; (c) say no to the sale
              of personal information; (d) access your personal information; (e) request deletion of your personal information;
              and (f) not be discriminated against for exercising your privacy rights. We do not sell personal information as
              defined under the CCPA. To submit a request, contact us at <a href="mailto:privacy@yourdomain.com" className="underline" style={{ color: '#C45D3E' }}>[privacy@yourdomain.com]</a>.
            </p>
          </section>

          {/* GDPR */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              14. European Privacy Rights (GDPR)
            </h2>
            <p>
              If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, we process your
              personal data on the following legal bases: (a) your consent; (b) performance of a contract with you;
              (c) compliance with a legal obligation; or (d) our legitimate interests, provided they are not overridden
              by your rights. You have the right to lodge a complaint with your local data protection authority if you
              believe your data has been processed unlawfully. Our data protection representative can be contacted
              at <a href="mailto:privacy@yourdomain.com" className="underline" style={{ color: '#C45D3E' }}>[privacy@yourdomain.com]</a>.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              15. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting
              the new Privacy Policy on this page and updating the "Last updated" date. For significant changes, we may
              also provide notice through the Service or via email. Your continued use of the Service after the effective
              date of the revised Privacy Policy constitutes your acceptance of the changes.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              16. Contact Us
            </h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices,
              please contact us at:
            </p>
            <div className="mt-3 p-4 rounded-xl" style={{ background: 'rgba(44,40,37,0.03)', border: '1px solid rgba(44,40,37,0.06)' }}>
              <p className="font-semibold">[Your Company Name]</p>
              <p>Email: <a href="mailto:privacy@yourdomain.com" className="underline" style={{ color: '#C45D3E' }}>[privacy@yourdomain.com]</a></p>
              <p>Address: [Your Company Address]</p>
              <p>Data Protection Officer: [DPO Name, if applicable]</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
