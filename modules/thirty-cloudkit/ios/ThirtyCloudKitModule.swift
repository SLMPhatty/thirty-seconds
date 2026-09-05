import ExpoModulesCore
import CloudKit
import UIKit

private let kContainerID = "iCloud.com.thirty.app"
private let kChallengeRecordType = "CKChallenge"
private let kEntryRecordType = "CKChallengeEntry"
private let kDisplayNameKey = "thirty.displayName"
private let kPendingAcceptedShareKey = "thirty.pendingAcceptedShare"
private let kPendingInviteShareURLKey = "thirty.pendingInviteShareURL"
private let kPendingInviteShareFlagKey = "thirty.pendingInviteShareFlag"
private let kPendingInviteMetadataArchiveKey = "thirty.pendingInviteMetadataArchive"
private let kCachedChallengesKey = "thirty.cachedChallenges"

/// Stashes CKShare.Metadata from AppDelegate when the friend taps an iCloud invite.
/// `CKShare.Metadata.share.url` is often nil in that callback, so we keep the metadata
/// itself and accept via CKAcceptSharesOperation after the unlock check.
/// Metadata is also archived to UserDefaults so it survives process death before IAP unlock.
public enum ThirtyCloudKitShareBridge {
  public static var pendingMetadata: CKShare.Metadata?

  public static func archivePendingMetadata(_ metadata: CKShare.Metadata) {
    do {
      let data = try NSKeyedArchiver.archivedData(withRootObject: metadata, requiringSecureCoding: true)
      UserDefaults.standard.set(data, forKey: kPendingInviteMetadataArchiveKey)
    } catch {
      // Best-effort; in-memory + URL/flag still help when process stays alive.
      NSLog("[ThirtyCloudKit] failed to archive pending share metadata: \(error.localizedDescription)")
    }
  }

  @discardableResult
  public static func restorePendingMetadataFromArchive() -> CKShare.Metadata? {
    if let existing = pendingMetadata {
      return existing
    }
    guard let data = UserDefaults.standard.data(forKey: kPendingInviteMetadataArchiveKey) else {
      return nil
    }
    do {
      let unarchived = try NSKeyedUnarchiver.unarchivedObject(
        ofClass: CKShare.Metadata.self,
        from: data
      )
      pendingMetadata = unarchived
      return unarchived
    } catch {
      NSLog("[ThirtyCloudKit] failed to unarchive pending share metadata: \(error.localizedDescription)")
      UserDefaults.standard.removeObject(forKey: kPendingInviteMetadataArchiveKey)
      return nil
    }
  }

  public static func clearArchivedPendingMetadata() {
    UserDefaults.standard.removeObject(forKey: kPendingInviteMetadataArchiveKey)
  }

  public static var hasArchivedPendingMetadata: Bool {
    UserDefaults.standard.data(forKey: kPendingInviteMetadataArchiveKey) != nil
  }

  public static func stashPendingInvite(_ metadata: CKShare.Metadata) {
    pendingMetadata = metadata
    archivePendingMetadata(metadata)
    let defaults = UserDefaults.standard
    var payload: [String: Any] = ["hasPendingMetadata": true]
    if let shareURL = metadata.share.url?.absoluteString, !shareURL.isEmpty {
      defaults.set(shareURL, forKey: kPendingInviteShareURLKey)
      payload["shareURL"] = shareURL
    }
    defaults.set(true, forKey: kPendingInviteShareFlagKey)
    DispatchQueue.main.async {
      NotificationCenter.default.post(
        name: Notification.Name("ThirtyCloudKitShareInvite"),
        object: nil,
        userInfo: payload
      )
    }
  }
}

private struct ChallengeMember: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var isSelf: Bool = false
}

private struct ChallengeSummary: Record {
  @Field var id: String = ""
  @Field var zoneName: String = ""
  @Field var ownerName: String = ""
  @Field var name: String = ""
  @Field var createdAt: Double = 0
  @Field var creatorName: String = ""
  @Field var isOwner: Bool = false
}

private struct CompletionEntry: Record {
  @Field var memberId: String = ""
  @Field var memberName: String = ""
  @Field var date: String = ""
  @Field var completedAt: Double = 0
}

public class ThirtyCloudKitModule: Module {
  private var container: CKContainer { CKContainer(identifier: kContainerID) }
  private var privateDB: CKDatabase { container.privateCloudDatabase }
  private var sharedDB: CKDatabase { container.sharedCloudDatabase }
  private var pushObserver: NSObjectProtocol?
  private var membershipObserver: NSObjectProtocol?
  private var shareInviteObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("ThirtyCloudKit")

    Events("onChallengeEntryReceived", "onMembershipChanged", "onCloudKitShareInvite")

    OnCreate {
      // Survive process death between invite tap and IAP unlock / accept.
      _ = ThirtyCloudKitShareBridge.restorePendingMetadataFromArchive()

      self.pushObserver = NotificationCenter.default.addObserver(
        forName: Notification.Name("ThirtyCloudKitSilentPush"),
        object: nil,
        queue: .main
      ) { [weak self] note in
        guard let self = self else { return }
        let userInfo = note.userInfo ?? [:]
        // CKNotification key shape: ck -> [ "ce" -> zoneID dict, ... ]
        if let ck = userInfo["ck"] as? [String: Any],
           let zoneInfo = ck["ce"] as? [String: Any] ?? ck["fet"] as? [String: Any] {
          let zoneName = zoneInfo["zid"] as? String ?? zoneInfo["zoneName"] as? String ?? ""
          let ownerName = zoneInfo["zoid"] as? String ?? zoneInfo["ownerName"] as? String ?? ""
          self.sendEvent("onChallengeEntryReceived", [
            "zoneName": zoneName,
            "ownerName": ownerName
          ])
        } else {
          // Unknown payload shape — still emit so JS can refresh all challenges
          self.sendEvent("onChallengeEntryReceived", [
            "zoneName": "",
            "ownerName": ""
          ])
        }
      }

      self.membershipObserver = NotificationCenter.default.addObserver(
        forName: Notification.Name("ThirtyCloudKitShareAccepted"),
        object: nil,
        queue: .main
      ) { [weak self] note in
        guard let self = self else { return }
        var payload: [String: Any] = [:]
        note.userInfo?.forEach { key, value in
          if let stringKey = key as? String {
            payload[stringKey] = value
          }
        }
        self.sendEvent("onMembershipChanged", payload)
      }

      self.shareInviteObserver = NotificationCenter.default.addObserver(
        forName: Notification.Name("ThirtyCloudKitShareInvite"),
        object: nil,
        queue: .main
      ) { [weak self] note in
        guard let self = self else { return }
        var payload: [String: Any] = [:]
        note.userInfo?.forEach { key, value in
          if let stringKey = key as? String {
            payload[stringKey] = value
          }
        }
        self.sendEvent("onCloudKitShareInvite", payload)
      }
    }

    OnDestroy {
      if let observer = self.pushObserver {
        NotificationCenter.default.removeObserver(observer)
      }
      if let observer = self.membershipObserver {
        NotificationCenter.default.removeObserver(observer)
      }
      if let observer = self.shareInviteObserver {
        NotificationCenter.default.removeObserver(observer)
      }
    }

    AsyncFunction("isAvailable") { (promise: Promise) in
      self.container.accountStatus { status, error in
        if let error = error {
          promise.reject("CK_ACCOUNT_ERROR", error.localizedDescription)
          return
        }
        promise.resolve(status == .available)
      }
    }

    AsyncFunction("getDeviceOwnerName") { () -> String in
      return UIDevice.current.name
    }

    AsyncFunction("getDisplayName") { () -> String? in
      let store = NSUbiquitousKeyValueStore.default
      store.synchronize()
      return store.string(forKey: kDisplayNameKey)
    }

    AsyncFunction("setDisplayName") { (name: String) in
      let store = NSUbiquitousKeyValueStore.default
      store.set(name, forKey: kDisplayNameKey)
      store.synchronize()
    }

    AsyncFunction("listChallenges") { (promise: Promise) in
      self.fetchAllChallenges(promise: promise)
    }

    AsyncFunction("createChallenge") { (name: String, creatorName: String, promise: Promise) in
      self.createChallenge(name: name, creatorName: creatorName, promise: promise)
    }

    AsyncFunction("acceptShare") { (urlString: String, promise: Promise) in
      self.acceptShare(urlString: urlString, promise: promise)
    }

    AsyncFunction("acceptPendingShare") { (promise: Promise) in
      let meta = ThirtyCloudKitShareBridge.restorePendingMetadataFromArchive()
      guard let meta = meta else {
        // No in-memory or archived metadata — clear stale flag so we do not loop.
        UserDefaults.standard.removeObject(forKey: kPendingInviteShareFlagKey)
        promise.reject("CK_NO_PENDING_SHARE", "no pending share metadata")
        return
      }
      self.acceptShareMetadata(meta, promise: promise)
    }

    AsyncFunction("hasPendingShareInvite") { () -> Bool in
      if ThirtyCloudKitShareBridge.pendingMetadata != nil {
        return true
      }
      if ThirtyCloudKitShareBridge.hasArchivedPendingMetadata {
        return true
      }
      let defaults = UserDefaults.standard
      if defaults.string(forKey: kPendingInviteShareURLKey) != nil {
        return true
      }
      return defaults.bool(forKey: kPendingInviteShareFlagKey)
    }

    AsyncFunction("consumePendingAcceptedShare") { () -> [String: Any]? in
      guard let pending = UserDefaults.standard.dictionary(forKey: kPendingAcceptedShareKey) else {
        return nil
      }
      UserDefaults.standard.removeObject(forKey: kPendingAcceptedShareKey)
      return pending
    }

    AsyncFunction("consumePendingInviteShareURL") { () -> String? in
      guard let url = UserDefaults.standard.string(forKey: kPendingInviteShareURLKey) else {
        return nil
      }
      UserDefaults.standard.removeObject(forKey: kPendingInviteShareURLKey)
      return url
    }

    AsyncFunction("getShareURL") { (zoneName: String, ownerName: String, promise: Promise) in
      self.getShareURL(zoneName: zoneName, ownerName: ownerName, promise: promise)
    }

    AsyncFunction("getMembers") { (zoneName: String, ownerName: String, promise: Promise) in
      self.getMembers(zoneName: zoneName, ownerName: ownerName, promise: promise)
    }

    AsyncFunction("getTodayCompletions") { (zoneName: String, ownerName: String, promise: Promise) in
      self.getCompletions(zoneName: zoneName, ownerName: ownerName, dateString: Self.todayString(), promise: promise)
    }

    AsyncFunction("getCompletionsForDate") { (zoneName: String, ownerName: String, date: String, promise: Promise) in
      self.getCompletions(zoneName: zoneName, ownerName: ownerName, dateString: date, promise: promise)
    }

    AsyncFunction("recordCompletion") { (zoneName: String, ownerName: String, memberName: String, promise: Promise) in
      self.recordCompletion(zoneName: zoneName, ownerName: ownerName, memberName: memberName, promise: promise)
    }

    AsyncFunction("subscribeToChallenge") { (zoneName: String, ownerName: String, promise: Promise) in
      self.subscribeToChallenge(zoneName: zoneName, ownerName: ownerName, promise: promise)
    }

    AsyncFunction("leaveChallenge") { (zoneName: String, ownerName: String, promise: Promise) in
      self.leaveChallenge(zoneName: zoneName, ownerName: ownerName, promise: promise)
    }

    AsyncFunction("registerForPushNotifications") {
      DispatchQueue.main.async {
        UIApplication.shared.registerForRemoteNotifications()
      }
    }
  }

  // MARK: - Helpers

  private static func todayString() -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    formatter.timeZone = TimeZone.current
    return formatter.string(from: Date())
  }

  private func database(forOwner ownerName: String) -> CKDatabase {
    // CKCurrentUserDefaultName == "__defaultOwner__"
    return ownerName == CKCurrentUserDefaultName ? privateDB : sharedDB
  }

  private func zoneID(zoneName: String, ownerName: String) -> CKRecordZone.ID {
    return CKRecordZone.ID(zoneName: zoneName, ownerName: ownerName)
  }

  private func cloudKitErrorMessage(_ error: Error) -> String {
    guard let ckError = error as? CKError else {
      return error.localizedDescription
    }

    var parts: [String] = [ckError.localizedDescription]
    if let serverMessage = ckError.errorUserInfo[NSLocalizedFailureReasonErrorKey] as? String,
       !serverMessage.isEmpty,
       serverMessage != ckError.localizedDescription {
      parts.append(serverMessage)
    }

    if let partials = ckError.partialErrorsByItemID, !partials.isEmpty {
      for (_, partialError) in partials.prefix(3) {
        let message = partialError.localizedDescription
        if !message.isEmpty && !parts.contains(message) {
          parts.append(message)
        }
      }
    }

    return parts.joined(separator: " — ")
  }

  // MARK: - Local challenge cache

  private func challengeSummaryDict(_ s: ChallengeSummary) -> [String: Any] {
    [
      "id": s.id,
      "zoneName": s.zoneName,
      "ownerName": s.ownerName,
      "name": s.name,
      "createdAt": s.createdAt,
      "creatorName": s.creatorName,
      "isOwner": s.isOwner
    ]
  }

  private func summaryFromDict(_ d: [String: Any]) -> ChallengeSummary {
    let s = ChallengeSummary()
    s.id = d["id"] as? String ?? ""
    s.zoneName = d["zoneName"] as? String ?? ""
    s.ownerName = d["ownerName"] as? String ?? ""
    s.name = d["name"] as? String ?? "challenge"
    s.createdAt = d["createdAt"] as? Double ?? 0
    s.creatorName = d["creatorName"] as? String ?? ""
    s.isOwner = d["isOwner"] as? Bool ?? false
    return s
  }

  private func loadCachedChallenges() -> [ChallengeSummary] {
    guard let arr = UserDefaults.standard.array(forKey: kCachedChallengesKey) as? [[String: Any]] else {
      return []
    }
    return arr.map { summaryFromDict($0) }
  }

  private func saveCachedChallenges(_ challenges: [ChallengeSummary]) {
    UserDefaults.standard.set(challenges.map { challengeSummaryDict($0) }, forKey: kCachedChallengesKey)
  }

  private func upsertCachedChallenge(_ summary: ChallengeSummary) {
    var cached = loadCachedChallenges()
    cached.removeAll { $0.zoneName == summary.zoneName && $0.ownerName == summary.ownerName }
    cached.insert(summary, at: 0)
    saveCachedChallenges(cached)
  }

  private func removeCachedChallenge(zoneName: String, ownerName: String) {
    var cached = loadCachedChallenges()
    cached.removeAll { $0.zoneName == zoneName && $0.ownerName == ownerName }
    saveCachedChallenges(cached)
  }

  private func mergeChallenges(cloud: [ChallengeSummary], cache: [ChallengeSummary]) -> [ChallengeSummary] {
    var byKey: [String: ChallengeSummary] = [:]
    for c in cache {
      byKey["\(c.zoneName)|\(c.ownerName)"] = c
    }
    for c in cloud {
      byKey["\(c.zoneName)|\(c.ownerName)"] = c
    }
    return Array(byKey.values).sorted { $0.createdAt > $1.createdAt }
  }

  private func isQueryIndexError(_ error: Error) -> Bool {
    let msg = error.localizedDescription.lowercased()
    return msg.contains("indexable")
      || msg.contains("not marked")
      || msg.contains("cannot query")
      || msg.contains("no record type")
  }

  // MARK: - List

  private func fetchAllChallenges(promise: Promise) {
    let group = DispatchGroup()
    var allChallenges: [ChallengeSummary] = []
    let queue = DispatchQueue(label: "thirty.cloudkit.list", attributes: .concurrent)
    var firstError: Error?

    let appendResults: (CKDatabase, Bool) -> Void = { db, isOwner in
      group.enter()
      db.fetchAllRecordZones { zones, error in
        if let error = error { firstError = firstError ?? error; group.leave(); return }
        guard let zones = zones else { group.leave(); return }
        let challengeZones = zones.filter { $0.zoneID.zoneName.hasPrefix("thirty-challenge-") }
        if challengeZones.isEmpty { group.leave(); return }

        let zoneGroup = DispatchGroup()
        for zone in challengeZones {
          zoneGroup.enter()
          let query = CKQuery(recordType: kChallengeRecordType, predicate: NSPredicate(value: true))
          db.perform(query, inZoneWith: zone.zoneID) { records, err in
            if let err = err { firstError = firstError ?? err; zoneGroup.leave(); return }
            if let record = records?.first {
              let summary = ChallengeSummary()
              summary.id = record.recordID.recordName
              summary.zoneName = zone.zoneID.zoneName
              summary.ownerName = zone.zoneID.ownerName
              summary.name = record["name"] as? String ?? "challenge"
              summary.createdAt = (record["createdAt"] as? Date ?? Date()).timeIntervalSince1970
              summary.creatorName = record["creatorName"] as? String ?? ""
              summary.isOwner = isOwner
              queue.async(flags: .barrier) { allChallenges.append(summary) }
            }
            zoneGroup.leave()
          }
        }
        zoneGroup.notify(queue: queue) { group.leave() }
      }
    }

    appendResults(privateDB, true)
    appendResults(sharedDB, false)

    group.notify(queue: .main) {
      let cached = self.loadCachedChallenges()
      if let err = firstError {
        if !cached.isEmpty && self.isQueryIndexError(err) {
          promise.resolve(self.mergeChallenges(cloud: [], cache: cached))
          return
        }
        if allChallenges.isEmpty {
          promise.reject("CK_LIST_ERROR", err.localizedDescription)
          return
        }
      }
      let merged = self.mergeChallenges(cloud: allChallenges, cache: cached)
      self.saveCachedChallenges(merged)
      promise.resolve(merged)
    }
  }

  // MARK: - Create

  private func createChallenge(name: String, creatorName: String, promise: Promise) {
    let zoneName = "thirty-challenge-\(UUID().uuidString)"
    let zone = CKRecordZone(zoneName: zoneName)

    privateDB.save(zone) { savedZone, error in
      if let error = error {
        promise.reject("CK_ZONE_ERROR", error.localizedDescription)
        return
      }
      guard let savedZone = savedZone else {
        promise.reject("CK_ZONE_ERROR", "failed to save zone")
        return
      }

      let challengeID = CKRecord.ID(recordName: UUID().uuidString, zoneID: savedZone.zoneID)
      let record = CKRecord(recordType: kChallengeRecordType, recordID: challengeID)
      record["name"] = name as CKRecordValue
      record["createdAt"] = Date() as CKRecordValue
      record["creatorName"] = creatorName as CKRecordValue
      record["maxMembers"] = 50 as CKRecordValue

      let shareID = CKRecord.ID(recordName: UUID().uuidString, zoneID: savedZone.zoneID)
      var share = CKShare(rootRecord: record, shareID: shareID)
      share[CKShare.SystemFieldKey.title] = name as CKRecordValue
      // "Invite friends" is link-based: the recipient is not pre-selected as a
      // CKShare participant before the invite is sent. `.none` creates a share URL
      // that only explicitly invited participants can use, so friends tapping the
      // message cannot join. Give anyone with the link read/write access so they can
      // accept the challenge and create their own CKChallengeEntry records.
      share.publicPermission = .readWrite

      let op = CKModifyRecordsOperation(recordsToSave: [record, share], recordIDsToDelete: nil)
      op.savePolicy = .ifServerRecordUnchanged
      op.database = self.privateDB

      op.modifyRecordsCompletionBlock = { savedRecords, _, error in
        if let error = error {
          if let ckError = error as? CKError,
             ckError.code == .serverRecordChanged,
             let serverShare = ckError.serverRecord as? CKShare {
            share = serverShare
          } else {
            promise.reject("CK_CREATE_ERROR", self.cloudKitErrorMessage(error))
            return
          }
        }

        if let returnedShare = savedRecords?.compactMap({ $0 as? CKShare }).first {
          share = returnedShare
        }

        // `CKShare.url` is only populated after CloudKit saves the share. Use the
        // share returned in the final modify completion, matching Apple's
        // UICloudSharingController sample, instead of a per-record callback or a
        // post-save refetch. Build 42 reached this path with no URL because the
        // per-record value was not reliable enough as the source of truth.
        guard let url = share.url?.absoluteString, !url.isEmpty else {
          promise.reject("CK_SHARE_URL_ERROR", "CloudKit saved the invitation but did not return a link")
          return
        }

        DispatchQueue.main.async {
          let summary = ChallengeSummary()
          summary.id = challengeID.recordName
          summary.zoneName = savedZone.zoneID.zoneName
          summary.ownerName = CKCurrentUserDefaultName
          summary.name = name
          summary.createdAt = Date().timeIntervalSince1970
          summary.creatorName = creatorName
          summary.isOwner = true
          self.upsertCachedChallenge(summary)
          promise.resolve([
            "challenge": summary,
            "shareURL": url
          ])
        }
      }
      self.privateDB.add(op)
    }
  }

  // MARK: - Accept share

  private func clearPendingInviteState() {
    ThirtyCloudKitShareBridge.pendingMetadata = nil
    ThirtyCloudKitShareBridge.clearArchivedPendingMetadata()
    UserDefaults.standard.removeObject(forKey: kPendingInviteShareURLKey)
    UserDefaults.standard.removeObject(forKey: kPendingInviteShareFlagKey)
  }

  /// Prefer clearing on accept failure so a dead invite cannot loop after unlock.
  private func shouldClearPendingOnAcceptFailure(_ error: Error) -> Bool {
    guard let ckError = error as? CKError else {
      return true
    }
    switch ckError.code {
    case .networkFailure, .networkUnavailable, .serviceUnavailable,
         .requestRateLimited, .zoneBusy, .resultsTruncated:
      return false
    default:
      // Includes alreadyShared, unknownItem, permissionFailure, serverRejectedRequest, etc.
      return true
    }
  }

  private func rejectAcceptAndMaybeClear(_ code: String, _ error: Error, promise: Promise) {
    if self.shouldClearPendingOnAcceptFailure(error) {
      self.clearPendingInviteState()
    }
    promise.reject(code, self.cloudKitErrorMessage(error))
  }

  private func acceptShareMetadata(_ meta: CKShare.Metadata, promise: Promise) {
    let acceptOp = CKAcceptSharesOperation(shareMetadatas: [meta])
    acceptOp.acceptSharesResultBlock = { acceptResult in
      switch acceptResult {
      case .success:
        DispatchQueue.main.async {
          let summary = ChallengeSummary()
          summary.id = meta.rootRecordID.recordName
          summary.zoneName = meta.share.recordID.zoneID.zoneName
          // Shared DB routing must use the zone ownerName, not ownerIdentity alone.
          summary.ownerName = meta.share.recordID.zoneID.ownerName
          summary.name = meta.share[CKShare.SystemFieldKey.title] as? String ?? "challenge"
          summary.createdAt = Date().timeIntervalSince1970
          summary.creatorName = meta.ownerIdentity.nameComponents.flatMap {
            PersonNameComponentsFormatter().string(from: $0)
          } ?? ""
          summary.isOwner = false

          self.clearPendingInviteState()

          let pending: [String: Any] = [
            "zoneName": summary.zoneName,
            "ownerName": summary.ownerName,
            "name": summary.name,
            "id": summary.id
          ]
          UserDefaults.standard.set(pending, forKey: kPendingAcceptedShareKey)
          self.upsertCachedChallenge(summary)

          NotificationCenter.default.post(
            name: Notification.Name("ThirtyCloudKitShareAccepted"),
            object: nil,
            userInfo: [
              "zoneName": summary.zoneName,
              "ownerName": summary.ownerName
            ]
          )
          promise.resolve(summary)
        }
      case .failure(let error):
        // Clear so unlock → re-accept does not loop on revoked / already-accepted invites.
        // User can re-tap the share link to try again.
        self.rejectAcceptAndMaybeClear("CK_ACCEPT_ERROR", error, promise: promise)
      }
    }
    CKContainer(identifier: kContainerID).add(acceptOp)
  }

  private func acceptShare(urlString: String, promise: Promise) {
    // Prefer stashed metadata from userDidAcceptCloudKitShareWith — share.url is often nil there.
    if let pending = ThirtyCloudKitShareBridge.restorePendingMetadataFromArchive() {
      self.acceptShareMetadata(pending, promise: promise)
      return
    }

    guard let url = URL(string: urlString), !urlString.isEmpty else {
      promise.reject("CK_INVALID_URL", "invalid share URL")
      return
    }
    let fetchOp = CKFetchShareMetadataOperation(shareURLs: [url])
    fetchOp.shouldFetchRootRecord = true
    var fetchedMetadata: CKShare.Metadata?
    var perShareError: Error?
    fetchOp.perShareMetadataResultBlock = { _, result in
      switch result {
      case .success(let meta):
        fetchedMetadata = meta
      case .failure(let error):
        perShareError = error
      }
    }
    fetchOp.fetchShareMetadataResultBlock = { result in
      switch result {
      case .success:
        guard let meta = fetchedMetadata else {
          if let perShareError = perShareError {
            self.rejectAcceptAndMaybeClear("CK_ACCEPT_ERROR", perShareError, promise: promise)
          } else {
            // Nothing usable — clear so we do not loop on a dead invite.
            self.clearPendingInviteState()
            promise.reject("CK_ACCEPT_ERROR", "no metadata")
          }
          return
        }
        self.acceptShareMetadata(meta, promise: promise)
      case .failure(let error):
        self.rejectAcceptAndMaybeClear("CK_FETCH_META_ERROR", error, promise: promise)
      }
    }
    container.add(fetchOp)
  }

  // MARK: - Share URL (for re-invite)

  private func getShareURL(zoneName: String, ownerName: String, promise: Promise) {
    let db = database(forOwner: ownerName)
    let zoneID = zoneID(zoneName: zoneName, ownerName: ownerName)
    db.fetch(withRecordZoneID: zoneID) { _, error in
      if let error = error {
        promise.reject("CK_FETCH_ZONE_ERROR", error.localizedDescription)
        return
      }
      let query = CKQuery(recordType: "cloudkit.share", predicate: NSPredicate(value: true))
      db.perform(query, inZoneWith: zoneID) { records, err in
        if let err = err {
          promise.reject("CK_FETCH_SHARE_ERROR", err.localizedDescription)
          return
        }
        if let share = records?.first as? CKShare, let url = share.url {
          promise.resolve(url.absoluteString)
        } else {
          promise.resolve(nil)
        }
      }
    }
  }

  // MARK: - Members

  private func getMembers(zoneName: String, ownerName: String, promise: Promise) {
    let db = database(forOwner: ownerName)
    let zoneID = zoneID(zoneName: zoneName, ownerName: ownerName)
    let query = CKQuery(recordType: "cloudkit.share", predicate: NSPredicate(value: true))
    db.perform(query, inZoneWith: zoneID) { records, error in
      if let error = error {
        promise.reject("CK_MEMBERS_ERROR", error.localizedDescription)
        return
      }
      guard let share = records?.first as? CKShare else {
        promise.resolve([])
        return
      }
      var members: [ChallengeMember] = []
      let currentUserID = share.currentUserParticipant?.userIdentity.userRecordID?.recordName
      for participant in share.participants {
        // Public-permission shares include an anonymous participant. Skip anyone
        // without a real iCloud user — they did not join.
        guard let recordName = participant.userIdentity.userRecordID?.recordName else { continue }
        let m = ChallengeMember()
        m.id = recordName
        m.name = participant.userIdentity.nameComponents.flatMap {
          PersonNameComponentsFormatter().string(from: $0)
        } ?? "member"
        m.isSelf = (m.id == currentUserID)
        members.append(m)
      }
      promise.resolve(members)
    }
  }

  // MARK: - Completions

  private func getCompletions(zoneName: String, ownerName: String, dateString: String, promise: Promise) {
    let db = database(forOwner: ownerName)
    let zoneID = zoneID(zoneName: zoneName, ownerName: ownerName)
    let predicate = NSPredicate(format: "date == %@", dateString)
    let query = CKQuery(recordType: kEntryRecordType, predicate: predicate)
    db.perform(query, inZoneWith: zoneID) { records, error in
      if let error = error {
        promise.reject("CK_COMPLETIONS_ERROR", error.localizedDescription)
        return
      }
      let entries: [CompletionEntry] = (records ?? []).map { r in
        let e = CompletionEntry()
        e.memberId = r.creatorUserRecordID?.recordName ?? "unknown"
        e.memberName = r["memberName"] as? String ?? ""
        e.date = r["date"] as? String ?? dateString
        e.completedAt = (r["completedAt"] as? Date ?? Date()).timeIntervalSince1970
        return e
      }
      promise.resolve(entries)
    }
  }

  private func recordCompletion(zoneName: String, ownerName: String, memberName: String, promise: Promise) {
    let db = database(forOwner: ownerName)
    let zoneID = zoneID(zoneName: zoneName, ownerName: ownerName)
    let today = Self.todayString()
    let recordID = CKRecord.ID(recordName: "\(today)-\(UUID().uuidString)", zoneID: zoneID)
    let record = CKRecord(recordType: kEntryRecordType, recordID: recordID)
    record["date"] = today as CKRecordValue
    record["completedAt"] = Date() as CKRecordValue
    record["memberName"] = memberName as CKRecordValue

    db.save(record) { _, error in
      if let error = error {
        promise.reject("CK_RECORD_ERROR", error.localizedDescription)
        return
      }
      promise.resolve(today)
    }
  }

  // MARK: - Subscriptions

  private func subscribeToChallenge(zoneName: String, ownerName: String, promise: Promise) {
    let db = database(forOwner: ownerName)
    let zoneID = zoneID(zoneName: zoneName, ownerName: ownerName)
    let subscriptionID = "challenge-\(zoneID.zoneName)"

    let subscription = CKRecordZoneSubscription(zoneID: zoneID, subscriptionID: subscriptionID)
    let info = CKSubscription.NotificationInfo()
    info.shouldSendContentAvailable = true
    info.shouldBadge = false
    info.alertBody = ""
    subscription.notificationInfo = info

    db.save(subscription) { _, error in
      if let error = error {
        let nsError = error as NSError
        if nsError.code == CKError.serverRejectedRequest.rawValue {
          promise.resolve(subscriptionID)
          return
        }
        promise.reject("CK_SUBSCRIBE_ERROR", error.localizedDescription)
        return
      }
      promise.resolve(subscriptionID)
    }
  }

  // MARK: - Leave

  private func leaveChallenge(zoneName: String, ownerName: String, promise: Promise) {
    let isOwner = (ownerName == CKCurrentUserDefaultName)
    let db = isOwner ? privateDB : sharedDB
    let zoneID = zoneID(zoneName: zoneName, ownerName: ownerName)

    if isOwner {
      db.delete(withRecordZoneID: zoneID) { _, error in
        if let error = error {
          promise.reject("CK_LEAVE_ERROR", error.localizedDescription)
          return
        }
        self.removeCachedChallenge(zoneName: zoneName, ownerName: ownerName)
        promise.resolve(true)
      }
    } else {
      // Participant leaving: remove the zone from local shared DB by deleting the share locally.
      // CloudKit handles participant removal when the share is rejected/deleted server-side.
      let query = CKQuery(recordType: "cloudkit.share", predicate: NSPredicate(value: true))
      db.perform(query, inZoneWith: zoneID) { records, error in
        if let error = error {
          promise.reject("CK_LEAVE_ERROR", error.localizedDescription)
          return
        }
        guard let share = records?.first as? CKShare else {
          self.removeCachedChallenge(zoneName: zoneName, ownerName: ownerName)
          promise.resolve(true)
          return
        }
        let op = CKModifyRecordsOperation(recordsToSave: nil, recordIDsToDelete: [share.recordID])
        op.modifyRecordsResultBlock = { result in
          switch result {
          case .success:
            self.removeCachedChallenge(zoneName: zoneName, ownerName: ownerName)
            promise.resolve(true)
          case .failure(let err):
            promise.reject("CK_LEAVE_ERROR", err.localizedDescription)
          }
        }
        db.add(op)
      }
    }
  }
}
