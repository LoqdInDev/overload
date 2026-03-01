import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-sm mb-10" style={{ color: '#94908A' }}>
          Last updated: January 1, 2025
        </p>

        <div className="space-y-10 text-[15px] leading-relaxed" style={{ color: '#4A4540' }}>
          {/* Acceptance */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the Overload marketing platform (the "Service") operated by [Your Company Name]
              ("we," "our," or "us"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree
              to these Terms, you may not access or use the Service. If you are using the Service on behalf of an
              organization, you represent and warrant that you have the authority to bind that organization to these Terms.
            </p>
            <p className="mt-3">
              We reserve the right to modify these Terms at any time. We will provide notice of material changes by
              posting the updated Terms on the Service and updating the "Last updated" date. Your continued use of the
              Service after such changes constitutes your acceptance of the revised Terms.
            </p>
          </section>

          {/* Account Terms */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              2. Account Terms
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must be at least 16 years of age to use the Service.</li>
              <li>You must provide accurate, complete, and current information when creating your account.</li>
              <li>You are responsible for maintaining the security of your account credentials. You must not share your password or allow others to access your account.</li>
              <li>You are responsible for all activity that occurs under your account, whether or not authorized by you.</li>
              <li>You must notify us immediately of any unauthorized use of your account or any other breach of security.</li>
              <li>You may not use the Service for any illegal or unauthorized purpose.</li>
              <li>One person or legal entity may maintain multiple accounts, but each account must be associated with a unique email address.</li>
            </ul>
          </section>

          {/* Workspaces and Teams */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              3. Workspaces and Team Access
            </h2>
            <p>
              The Service allows you to create workspaces and invite team members to collaborate. As the workspace owner,
              you are responsible for managing access and permissions within your workspace. You agree that:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>You are responsible for the actions of all team members within your workspace.</li>
              <li>You will only invite individuals who are authorized to access the data within the workspace.</li>
              <li>Workspace data may be accessible to all members of that workspace according to their assigned roles.</li>
              <li>Removing a team member's access does not guarantee the deletion of data they may have previously accessed or exported.</li>
            </ul>
          </section>

          {/* Payment Terms */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              4. Payment Terms
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Subscription Plans:</strong> The Service may offer free and paid subscription plans. Paid plans are billed in advance on a monthly or annual basis, as selected at the time of purchase.</li>
              <li><strong>Pricing:</strong> All prices are listed in US Dollars unless otherwise stated. We reserve the right to change pricing at any time, with at least 30 days' notice before the next billing cycle.</li>
              <li><strong>Payment Method:</strong> You authorize us to charge the payment method on file for all applicable fees. You are responsible for keeping your payment information current.</li>
              <li><strong>Refunds:</strong> Payments are non-refundable except as required by law or as expressly stated in these Terms. If you cancel a paid subscription, you will retain access to paid features until the end of your current billing period.</li>
              <li><strong>Taxes:</strong> Prices do not include applicable taxes. You are responsible for all taxes associated with your use of the Service, except for taxes based on our income.</li>
              <li><strong>Failed Payments:</strong> If a payment fails, we may suspend or restrict your access to paid features until payment is successfully processed. We will make reasonable efforts to notify you before any suspension.</li>
              <li><strong>Free Trial:</strong> We may offer free trial periods at our discretion. At the end of a free trial, you will be automatically charged unless you cancel before the trial ends.</li>
            </ul>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              5. Acceptable Use Policy
            </h2>
            <p className="mb-3">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any applicable law, regulation, or third-party rights.</li>
              <li>Send spam, unsolicited messages, or engage in deceptive marketing practices.</li>
              <li>Upload or transmit malware, viruses, or any malicious code.</li>
              <li>Attempt to gain unauthorized access to the Service, other accounts, or our systems.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Scrape, crawl, or use automated means to access the Service without our written permission.</li>
              <li>Reverse engineer, decompile, or disassemble the Service or any component thereof.</li>
              <li>Use the Service to create a competing product or service.</li>
              <li>Transmit content that is unlawful, harmful, threatening, abusive, harassing, defamatory, obscene, or otherwise objectionable.</li>
              <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity.</li>
              <li>Use the Service in a manner that could damage, disable, overburden, or impair our servers or networks.</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate your account if we determine, in our sole discretion,
              that you have violated this Acceptable Use Policy.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              6. Intellectual Property
            </h2>
            <h3 className="text-base font-semibold mt-4 mb-2" style={{ color: '#332F2B' }}>6.1 Our Intellectual Property</h3>
            <p>
              The Service, including all software, design, text, graphics, logos, icons, and other content, is the
              property of [Your Company Name] and is protected by intellectual property laws. You may not copy,
              modify, distribute, sell, or lease any part of our Service without our written permission.
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2" style={{ color: '#332F2B' }}>6.2 Your Content</h3>
            <p>
              You retain all ownership rights to the content you create, upload, or manage through the Service
              ("Your Content"). By using the Service, you grant us a limited, non-exclusive, worldwide license to
              use, store, process, and display Your Content solely for the purpose of providing and improving the Service.
              This license terminates when you delete Your Content or your account.
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2" style={{ color: '#332F2B' }}>6.3 AI-Generated Content</h3>
            <p>
              Content generated by AI features within the Service is provided for your use in connection with the Service.
              You are responsible for reviewing and ensuring the appropriateness and accuracy of any AI-generated content
              before publishing or distributing it. We make no guarantees regarding the accuracy, originality, or
              legal compliance of AI-generated content.
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2" style={{ color: '#332F2B' }}>6.4 Feedback</h3>
            <p>
              If you provide us with feedback, suggestions, or ideas regarding the Service, you grant us an unrestricted,
              perpetual, irrevocable, royalty-free license to use, modify, and incorporate such feedback for any purpose
              without compensation to you.
            </p>
          </section>

          {/* API and Integrations */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              7. API and Integration Terms
            </h2>
            <p>
              The Service may provide APIs and integration capabilities. If you use our APIs, you agree to the following:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>You will not exceed any rate limits or usage quotas we establish.</li>
              <li>You will not use the API in a way that could harm, disable, or impair the Service.</li>
              <li>You are responsible for the security of your API keys and tokens.</li>
              <li>We may modify, suspend, or discontinue API access at any time with reasonable notice.</li>
              <li>We are not responsible for third-party services you connect via integrations.</li>
            </ul>
          </section>

          {/* Data Processing */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              8. Data Processing
            </h2>
            <p>
              To the extent that we process personal data on your behalf (as a data processor), we will process such
              data only in accordance with your instructions and applicable data protection laws. Our Privacy Policy,
              available at <a href="/privacy" className="underline" style={{ color: '#C45D3E' }}>/privacy</a>, describes
              how we collect, use, and protect personal data. For enterprise customers, we may enter into a separate
              Data Processing Agreement upon request.
            </p>
          </section>

          {/* Service Availability */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              9. Service Availability and Support
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Uptime:</strong> We strive to maintain high availability but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.</li>
              <li><strong>Modifications:</strong> We reserve the right to modify, update, or discontinue any feature of the Service at any time. We will provide reasonable notice of material changes.</li>
              <li><strong>Support:</strong> Support is provided according to your subscription plan. We will make commercially reasonable efforts to respond to support inquiries in a timely manner.</li>
              <li><strong>Backups:</strong> While we maintain regular backups of the Service data, you are responsible for maintaining your own backups of Your Content.</li>
            </ul>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              10. Termination
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>By You:</strong> You may cancel your account at any time through your account settings. Upon cancellation, your access to paid features will continue until the end of your current billing period.</li>
              <li><strong>By Us:</strong> We may suspend or terminate your account at any time for any reason, including but not limited to violation of these Terms, non-payment, or if we cease to offer the Service. We will provide reasonable notice when possible.</li>
              <li><strong>Effect of Termination:</strong> Upon termination, your right to use the Service ceases immediately. We may delete your data after a reasonable retention period (typically 30 days) unless required by law to retain it. You may request an export of your data before termination.</li>
              <li><strong>Survival:</strong> Sections relating to intellectual property, limitation of liability, indemnification, and governing law survive termination of these Terms.</li>
            </ul>
          </section>

          {/* Disclaimer */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              11. Disclaimer of Warranties
            </h2>
            <p className="uppercase text-xs tracking-wider leading-relaxed" style={{ color: '#94908A' }}>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR
              IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING OUT OF COURSE OF DEALING OR USAGE OF TRADE.
              WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES
              OR OTHER HARMFUL COMPONENTS. WE DO NOT WARRANT THE ACCURACY, COMPLETENESS, OR USEFULNESS OF ANY
              INFORMATION PROVIDED THROUGH THE SERVICE, INCLUDING AI-GENERATED CONTENT. YOUR USE OF THE SERVICE
              IS AT YOUR SOLE RISK.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              12. Limitation of Liability
            </h2>
            <p className="uppercase text-xs tracking-wider leading-relaxed" style={{ color: '#94908A' }}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, [YOUR COMPANY NAME] SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA,
              GOODWILL, OR BUSINESS OPPORTUNITY ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE,
              WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY, EVEN
              IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL AGGREGATE LIABILITY FOR ALL
              CLAIMS RELATED TO THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE
              TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED US DOLLARS ($100).
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              13. Indemnification
            </h2>
            <p>
              You agree to indemnify, defend, and hold harmless [Your Company Name] and its officers, directors,
              employees, agents, and affiliates from and against any and all claims, damages, losses, liabilities,
              costs, and expenses (including reasonable attorneys' fees) arising out of or related to: (a) your use
              of the Service; (b) Your Content; (c) your violation of these Terms; or (d) your violation of any
              rights of a third party.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              14. Governing Law and Dispute Resolution
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of [Your State/Country],
              without regard to its conflict of law provisions. Any disputes arising out of or relating to these
              Terms or the Service shall be resolved through binding arbitration in accordance with the rules of
              the [Arbitration Association], except that either party may seek injunctive or other equitable relief
              in any court of competent jurisdiction. The arbitration shall take place in [Your City, State/Country],
              and the language of the arbitration shall be English.
            </p>
            <p className="mt-3">
              <strong>Class Action Waiver:</strong> You agree that any dispute resolution proceedings will be
              conducted only on an individual basis and not in a class, consolidated, or representative action.
            </p>
          </section>

          {/* General Provisions */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              15. General Provisions
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and [Your Company Name] regarding the Service.</li>
              <li><strong>Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.</li>
              <li><strong>Waiver:</strong> Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision.</li>
              <li><strong>Assignment:</strong> You may not assign or transfer these Terms without our prior written consent. We may assign our rights and obligations under these Terms without restriction.</li>
              <li><strong>Force Majeure:</strong> We shall not be liable for any failure or delay in performance resulting from causes beyond our reasonable control, including natural disasters, war, terrorism, labor disputes, government actions, or internet service failures.</li>
              <li><strong>Notices:</strong> We may provide notices to you via email, through the Service, or by posting on our website. You may provide notices to us at the contact information below.</li>
            </ul>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#332F2B' }}>
              16. Contact Information
            </h2>
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="mt-3 p-4 rounded-xl" style={{ background: 'rgba(44,40,37,0.03)', border: '1px solid rgba(44,40,37,0.06)' }}>
              <p className="font-semibold">[Your Company Name]</p>
              <p>Email: <a href="mailto:privacy@yourdomain.com" className="underline" style={{ color: '#C45D3E' }}>[privacy@yourdomain.com]</a></p>
              <p>Address: [Your Company Address]</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
