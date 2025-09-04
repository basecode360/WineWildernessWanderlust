import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

interface TermsAndConditionsModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function TermsAndConditionsModal({
  visible,
  onClose,
  onAccept,
}: TermsAndConditionsModalProps) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;

    if (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    ) {
      setHasScrolledToEnd(true);
    }
  };

  const handleAccept = () => {
    if (hasScrolledToEnd) {
      onAccept();
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Terms and Conditions</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.content}>
            <Text style={styles.heading}>Wine Wilderness Wanderlust</Text>
            <Text style={styles.heading}>Terms of Service</Text>

            <Text style={styles.lastUpdated}>
              LAST UPDATED: September 2, 2025
            </Text>

            <Text style={styles.paragraph}>
              These Terms of Service ("Terms") are a legal agreement between you
              ("you") and WanderGuide ("Wander Guide Audio Tours,"
              "WanderGuide," "we," "us," or "our") governing your access to and
              use of our website, mobile applications, and related services
              (collectively, the "Services").
            </Text>

            <Text style={styles.importantNotice}>
              BY ACCESSING OR USING THE SERVICES, OR BY CLICKING "I AGREE," YOU
              ACCEPT THESE TERMS. IF YOU DO NOT AGREE, DO NOT USE THE SERVICES.
            </Text>

            <Text style={styles.subheading}>1. Introduction & Eligibility</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>1.1 Acceptance of Agreement.</Text>{' '}
              These Terms govern your use of the Services.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>1.2 Age & Capacity.</Text> You must be
              18+ (or the age of majority in your jurisdiction) and have legal
              capacity to form a binding contract.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>
                1.3 Changes to the Services/Terms.
              </Text>{' '}
              We may modify features, pricing, availability, or these Terms at
              any time. We'll post the updated Terms with a new "Last Updated"
              date. Continued use means you accept the changes.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>1.4 Geographic Limitations.</Text> We do
              not represent the Services are available or appropriate in every
              jurisdiction.
            </Text>

            <Text style={styles.subheading}>2. Overview of the Services</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>2.1 What We Provide.</Text> GPS-based
              audio tours with stories, directions, and tips for walking and
              driving. Personal, non-commercial use only.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>2.2 GPS Dependency.</Text> Location
              triggers rely on device GPS (which may be inaccurate, delayed, or
              unavailable).
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>2.3 Paid Services.</Text> Some
              tours/features require a one-time purchase or subscription.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>2.4 Access Restrictions.</Text> We may
              suspend or restrict access if you violate these Terms or laws.
            </Text>

            <Text style={styles.subheading}>3. Registration & Accounts</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>3.1 Account.</Text> Some features
              require an account. You must provide accurate, current info and
              keep it updated.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>3.2 Credentials & Security.</Text>{' '}
              You're responsible for safeguarding your login and for all
              activity under your account. Notify us of any unauthorized use.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>3.3 Communications.</Text> If you
              provide a phone number or email, you consent to receiving
              service-related communications (standard rates apply; you can opt
              out where permitted).
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>3.4 Device & Costs.</Text> You're
              responsible for compatible devices, data plans, and any fees.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>3.5 Suspension/Termination.</Text> We
              may suspend or terminate your account at any time for any or no
              reason consistent with law.
            </Text>

            <Text style={styles.subheading}>
              4. Safety Disclaimer (Walking & Driving)
            </Text>
            <Text style={styles.warningBox}>
              <Text style={styles.warningText}>
                <Text style={styles.bold}>4.1 Inherent Risks.</Text> You
                understand and agree that walking tours, driving tours, and
                travel involve risks, including but not limited to traffic
                accidents, collisions, injuries, illness, property damage,
                theft, delays, or death. You voluntarily assume all risks
                associated with your use of the Services.
              </Text>
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>4.2 Driving Tours.</Text> If you are the
              driver, you are solely responsible for the safe operation of your
              vehicle. The App must be programmed and adjusted only while the
              vehicle is safely parked. You must use the App in a hands-free
              manner and comply with all distracted-driving laws and traffic
              regulations in your jurisdiction.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>4.3 Walking Tours.</Text> You are solely
              responsible for your own safety while walking. You must remain
              alert to your surroundings, traffic, terrain, and other hazards.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>4.4 Informational Only.</Text> The
              Services provide informational and entertainment content. They are
              not a substitute for your own judgment, official signage,
              conditions, or directions from authorities.
            </Text>

            <Text style={styles.subheading}>
              5. Accuracy, Availability & Third Parties
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>5.1 No Guarantee of Accuracy.</Text>{' '}
              Content may be incomplete, outdated, or inaccurate (hours,
              closures, routes, access, conditions). Verify independently.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>5.2 Availability.</Text> We do not
              guarantee the Services will be uninterrupted, error-free, or
              available at all times.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>5.3 Links & Third-Party Content.</Text>{' '}
              We are not responsible for third-party sites, businesses, content,
              or services referenced in the App. Your interactions with them are
              solely between you and them.
            </Text>

            <Text style={styles.subheading}>
              6. Purchases, Refunds & App-Store Terms
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>6.1 Prices & Changes.</Text> Prices,
              discounts, promotions, and availability may change without notice.
              Taxes and fees may apply.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>6.2 In-App Purchases.</Text> Purchases
              made via Apple App Store, Google Play, or other marketplaces are
              processed by those platforms and subject to their terms and refund
              policies.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>6.3 All Sales Final.</Text> Except where
              required by law or expressly stated by us, purchases are final. If
              you cannot access purchased content due to a verified technical
              issue we cannot resolve, you may request a refund within 30 days
              of purchase.
            </Text>

            <Text style={styles.subheading}>
              7. Intellectual Property & License
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>7.1 Our IP.</Text> The Services,
              including all audio, text, images, design, software, logos, and
              trademarks, are owned by WanderGuide or its licensors and
              protected by law.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>7.2 Your License.</Text> Subject to
              these Terms, we grant you a limited, revocable, non-exclusive,
              non-transferable, non-sublicensable license to install and use the
              App on your device for personal, non-commercial use.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>7.3 Restrictions.</Text> You may not
              copy, modify, distribute, publicly display, perform, reverse
              engineer, or create derivative works from the Services except as
              expressly permitted by law.
            </Text>

            <Text style={styles.subheading}>8. Prohibited Conduct</Text>
            <Text style={styles.paragraph}>You agree not to:</Text>
            <Text style={styles.bulletPoint}>
              • Use the Services unlawfully
            </Text>
            <Text style={styles.bulletPoint}>
              • Violate IP or privacy rights
            </Text>
            <Text style={styles.bulletPoint}>
              • Harass, threaten, or harm others
            </Text>
            <Text style={styles.bulletPoint}>
              • Upload viruses or harmful code
            </Text>
            <Text style={styles.bulletPoint}>
              • Circumvent security measures
            </Text>
            <Text style={styles.bulletPoint}>
              • Use the Services to compete with us
            </Text>
            <Text style={styles.bulletPoint}>
              • Share, resell, or publicly perform our content
            </Text>
            <Text style={styles.bulletPoint}>
              • Use the Services while impaired or in a manner that distracts
              from safe operation of a vehicle
            </Text>

            <Text style={styles.subheading}>9. Disclaimers</Text>
            <Text style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                YOU USE THE SERVICES AT YOUR OWN RISK. TO THE MAXIMUM EXTENT
                PERMITTED BY LAW, THE SERVICES ARE PROVIDED "AS IS" AND "AS
                AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS,
                IMPLIED, OR STATUTORY, INCLUDING MERCHANTABILITY, FITNESS FOR A
                PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, AND THAT THE
                SERVICES WILL BE ERROR-FREE, SECURE, OR UNINTERRUPTED.
              </Text>
            </Text>

            <Text style={styles.subheading}>10. Limitation of Liability</Text>
            <Text style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW: WANDERGUIDE AND ITS
                OWNERS, OFFICERS, DIRECTORS, EMPLOYEES, CONTRACTORS, AND
                AFFILIATES SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT,
                INCIDENTAL, CONSEQUENTIAL, SPECIAL, EXEMPLARY, OR PUNITIVE
                DAMAGES, INCLUDING BUT NOT LIMITED TO PERSONAL INJURY, DEATH,
                PROPERTY DAMAGE, LOST PROFITS, LOST DATA, OR OTHER LOSSES
                ARISING OUT OF OR RELATED TO THE SERVICES OR THESE TERMS.
              </Text>
            </Text>
            <Text style={styles.paragraph}>
              WITHOUT LIMITING THE FOREGOING, THE TOTAL LIABILITY SHALL NOT
              EXCEED THE GREATER OF (I) THE FEES YOU PAID TO WANDERGUIDE FOR THE
              PURCHASE GIVING RISE TO THE CLAIM IN THE TWO (2) MONTHS PRECEDING
              THE EVENT, OR (II) FIFTY U.S. DOLLARS (USD $50).
            </Text>

            <Text style={styles.subheading}>11. Indemnification</Text>
            <Text style={styles.paragraph}>
              You agree to defend, indemnify, and hold harmless WanderGuide and
              its affiliates from any claims, losses, damages, liabilities,
              costs, and expenses (including reasonable attorneys' fees) arising
              from: (a) your use of the Services; (b) your breach of these
              Terms; or (c) your violation of laws or third-party rights.
            </Text>

            <Text style={styles.subheading}>
              12. Assumption of Risk & Release
            </Text>
            <Text style={styles.warningBox}>
              <Text style={styles.warningText}>
                You understand and agree that use of the Services is at your
                sole risk. You expressly release WanderGuide and its affiliates
                from any and all liability, claims, or causes of action arising
                from or related to accidents, injuries, property damage, delays,
                or other harm you may experience while using the Services. You
                are solely responsible for your safety and conduct during any
                walking or driving tour.
              </Text>
            </Text>

            <Text style={styles.subheading}>13. Privacy</Text>
            <Text style={styles.paragraph}>
              Our collection and use of personal data (including location/GPS)
              is described in our Privacy Policy. By using the Services, you
              consent to those practices.
            </Text>

            <Text style={styles.subheading}>14. Governing Law & Disputes</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>14.1 Governing Law.</Text> These Terms
              are governed by applicable local laws.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>14.2 Arbitration.</Text> Except where
              prohibited by law, disputes shall be resolved by binding
              arbitration. No class actions or consolidated proceedings.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>14.3 Jury & Class Waiver.</Text> YOU
              WAIVE ANY RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN A CLASS
              ACTION.
            </Text>

            <Text style={styles.subheading}>15. General Provisions</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>15.1 Force Majeure.</Text> We are not
              liable for delays or failures due to events beyond our reasonable
              control.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>15.2 Assignment.</Text> We may assign
              these Terms. You may not assign without our written consent.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>15.3 Entire Agreement.</Text> These
              Terms and the Privacy Policy are the entire agreement and
              supersede prior agreements on this subject.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>15.4 Language.</Text> These Terms are in
              English. Translations are for convenience; the English version
              controls.
            </Text>

            <Text style={styles.subheading}>16. Contact Information</Text>
            <Text style={styles.paragraph}>
              If you have any questions about these Terms and Conditions, please
              contact us at:
            </Text>
            <Text style={styles.contactInfo}>
              Wander Guide Audio Tours (WanderGuide){'\n'}
              Email: hello@winewildernesswanderlust.com
            </Text>

            <Text style={styles.lastUpdatedBottom}>
              Last updated: September 2, 2025
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {!hasScrolledToEnd && (
            <Text style={styles.scrollHint}>
              Please scroll to the bottom to continue
            </Text>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.declineButton} onPress={onClose}>
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.acceptButton,
                !hasScrolledToEnd && styles.acceptButtonDisabled,
              ]}
              onPress={handleAccept}
              disabled={!hasScrolledToEnd}
            >
              <Text
                style={[
                  styles.acceptButtonText,
                  !hasScrolledToEnd && styles.acceptButtonTextDisabled,
                ]}
              >
                Accept & Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('5%'),
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    paddingTop: hp('6%'),
  },
  title: {
    fontSize: wp('5%'),
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: wp('2%'),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: wp('5%'),
  },
  content: {
    paddingBottom: hp('2%'),
  },
  heading: {
    fontSize: wp('4.5%'),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: hp('1%'),
    textAlign: 'center',
  },
  subheading: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#333',
    marginTop: hp('2.5%'),
    marginBottom: hp('1%'),
  },
  paragraph: {
    fontSize: wp('3.5%'),
    color: '#555',
    lineHeight: wp('5.5%'),
    marginBottom: hp('1.5%'),
    textAlign: 'justify',
  },
  bulletPoint: {
    fontSize: wp('3.5%'),
    color: '#555',
    lineHeight: wp('5%'),
    marginBottom: hp('0.5%'),
    marginLeft: wp('3%'),
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  importantNotice: {
    fontSize: wp('3.5%'),
    color: '#d32f2f',
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: '#ffebee',
    padding: wp('3%'),
    borderRadius: wp('2%'),
    marginVertical: hp('2%'),
    lineHeight: wp('5%'),
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: wp('3%'),
    marginVertical: hp('1%'),
    borderRadius: wp('1%'),
  },
  warningText: {
    fontSize: wp('3.5%'),
    color: '#856404',
    lineHeight: wp('5%'),
  },
  disclaimerBox: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    padding: wp('3%'),
    marginVertical: hp('1%'),
    borderRadius: wp('1%'),
  },
  disclaimerText: {
    fontSize: wp('3%'),
    color: '#495057',
    lineHeight: wp('4.5%'),
    fontWeight: '500',
  },
  contactInfo: {
    fontSize: wp('3.5%'),
    color: '#555',
    backgroundColor: '#f8f9fa',
    padding: wp('3%'),
    borderRadius: wp('2%'),
    marginVertical: hp('1%'),
    lineHeight: wp('5%'),
  },
  lastUpdated: {
    fontSize: wp('3%'),
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: hp('2%'),
  },
  lastUpdatedBottom: {
    fontSize: wp('3%'),
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: hp('3%'),
  },
  footer: {
    padding: wp('5%'),
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
    backgroundColor: '#f8f9fa',
  },
  scrollHint: {
    fontSize: wp('3.5%'),
    color: '#666',
    textAlign: 'center',
    marginBottom: hp('1%'),
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp('3%'),
  },
  declineButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: wp('3%'),
    height: hp('6%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#666',
    fontSize: wp('4%'),
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#5CC4C4',
    borderRadius: wp('3%'),
    height: hp('6%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: wp('4%'),
    fontWeight: '600',
  },
  acceptButtonTextDisabled: {
    color: '#ccc',
  },
});
