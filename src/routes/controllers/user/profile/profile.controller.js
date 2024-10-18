const {
  UserInfo,
  UserPointsHistory,
  UserDealInterest,
  DealInfo,
  USER_RATING,
} = require("../../../../../models");
const { sequelize } = require("../../../../../models");
const path = require("path");
const fs = require("fs");
const moment = require("moment-timezone");
const { Web3 } = require("web3"); // require로 Web3를 가져옴
const web3 = new Web3(
  new Web3.providers.HttpProvider(
    "https://holesky.infura.io/v3/d6ecd425e13048f790b9697210cf1067"
  )
);

// 환경 변수에서 어드민 계정 정보를 가져옵니다.
const adminAddress = process.env.REACT_APP_ADMIN_WALLET_ADDRESS || "";
const adminPrivateKey = process.env.REACT_APP_ADMIN_WALLET_PRIVATE_KEY || "";

const contractAddress = "0x15e7a34b6a5aBf8b0aD4FcD85D873FD7e7163E97";
// 컨트랙트 ABI 가져오기
const contractABI = require(path.join(
  __dirname,
  "../../../../config/contract-abi/XpClaim"
));

const getProfile = async (req, res) => {
  const { walletAddress } = req.params;

  try {
    // 사용자 정보 조회
    const user = await UserInfo.findOne({
      where: { wallet_addr: walletAddress },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 포인트 히스토리 조회
    const pointHistory = await UserPointsHistory.findAll({
      where: { wallet_addr: walletAddress },
      order: [["date", "DESC"]],
      raw: true,
    });

    // 사용자가 클레임한 프로젝트 ID의 개수 조회
    const claimedProjectsCount = await UserPointsHistory.count({
      where: { wallet_addr: walletAddress },
      distinct: true,
      col: "project_id", // distinct한 project_id의 개수를 구함
    });

    // 프로필 데이터 생성
    const profile = {
      name: user.user_name || "Unknown User",
      email: user.email_addr || "",
      walletAddress: user.wallet_addr || walletAddress,
      bio: user.bio || "This user has no bio.",
      expertise: user.expertise || "None",
      membershipNft: user.membership_nft || null,
      stayUpdated: user.stay_updated === "Y",
      profileImage: user.user_image_link || "default-profile.png",
      xp: user.cur_xp || 0, // 프론트에서 'xp'로 사용하도록 데이터를 변환
      pointHistory: pointHistory || [],
      claimedProjectsCount: claimedProjectsCount || 0, // 클레임된 프로젝트 개수 추가
    };

    // 사용자 정보와 포인트 히스토리를 함께 반환
    res.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateProfile = async (req, res) => {
  const { walletAddress } = req.params;
  const { name, email, bio, expertise, membershipNft, stayUpdated } = req.body;

  try {
    const user = await UserInfo.findOne({
      where: { wallet_addr: walletAddress },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let profileImageUrl = user.user_image_link;
    if (req.file) {
      if (profileImageUrl) {
        const oldImagePath = path.join(
          __dirname,
          "../../../../assets/uploads",
          path.basename(profileImageUrl)
        );
        fs.unlink(oldImagePath, (err) => {
          if (err) {
            console.error("Error deleting old profile image:", err);
          }
        });
      }
      profileImageUrl = `uploads/${req.file.filename}`;
    }

    await UserInfo.update(
      {
        user_name: name,
        email_addr: email,
        bio: bio,
        expertise: expertise,
        user_image_link: profileImageUrl,
        membership_nft: membershipNft,
        stay_updated: stayUpdated === "Y" ? "Y" : "N",
      },
      { where: { wallet_addr: walletAddress } }
    );

    res.json({
      message: "Profile updated successfully",
      profileImage: profileImageUrl,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// XP 트랜잭션 보내는 기능
const truncateProjectName = (name, maxLength) => {
  return name.length > maxLength ? name.substring(0, maxLength) + "..." : name;
};

// 프론트에서 서명받고 서버단에서 admin transaction 코드
const updateXP = async (req, res) => {
  const { walletAddress, xpPoints, projectId, signature, projectName } =
    req.body;

  // 프로젝트 이름 잘라내기
  const truncatedProjectName = truncateProjectName(projectName, 12);

  try {
    const existingClaim = await UserPointsHistory.findOne({
      where: {
        wallet_addr: walletAddress,
        project_id: projectId,
      },
    });

    if (existingClaim) {
      return res
        .status(400)
        .json({ message: "XP has already been claimed for this project." });
    }

    const contract = new web3.eth.Contract(contractABI, contractAddress);

    const gasEstimate = await contract.methods
      .claimXP(walletAddress, xpPoints)
      .estimateGas({ from: adminAddress });

    const tx = {
      from: adminAddress,
      to: contractAddress,
      data: contract.methods.claimXP(walletAddress, xpPoints).encodeABI(),
      gas: gasEstimate,
      maxPriorityFeePerGas: web3.utils.toWei("2", "gwei"),
      maxFeePerGas: web3.utils.toWei("50", "gwei"),
    };

    const signedTx = await web3.eth.accounts.signTransaction(
      tx,
      adminPrivateKey
    );
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    if (!receipt.transactionHash) {
      return res.status(500).json({ message: "Transaction failed" });
    }

    const xpBalanceRaw = await contract.methods.getXP(walletAddress).call();
    const xpBalance = parseInt(xpBalanceRaw, 10);

    if (isNaN(xpBalance)) {
      return res.status(500).json({ message: "Failed to fetch XP balance" });
    }

    const user = await UserInfo.findOne({
      where: { wallet_addr: walletAddress },
    });
    const currentXP = user ? user.cur_xp : 0;
    const updatedXP = currentXP + xpPoints;

    await UserInfo.update(
      { cur_xp: updatedXP },
      { where: { wallet_addr: walletAddress } }
    );

    // // UserPointsHistory에 잘라낸 프로젝트 이름 추가
    // await UserPointsHistory.create({
    //   wallet_addr: walletAddress,
    //   date: moment().tz("Asia/Seoul").format("YYYY-MM-DD HH:mm:ss"),
    //   participation: "Discover",
    //   activity: `Voted on Project ${truncatedProjectName}`, // 잘라낸 프로젝트 이름 사용
    //   xp_earned: xpPoints,
    //   transaction_id: receipt.transactionHash,
    //   project_id: projectId,
    // });

    // UserPointsHistory에 프로젝트 이름 그대로 추가
    await UserPointsHistory.create({
      wallet_addr: walletAddress,
      date: moment().tz("Asia/Seoul").format("YYYY-MM-DD HH:mm:ss"),
      participation: "Discover",
      activity: `Voted on Project ${projectName}`, // 잘라낸 프로젝트 이름 사용
      xp_earned: xpPoints,
      transaction_id: receipt.transactionHash,
      project_id: projectId,
    });

    res.json({ success: true, transactionHash: receipt.transactionHash });
  } catch (error) {
    console.error("Error processing XP claim:", error); // 구체적인 오류 출력
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// const updateXP = async (req, res) => {
//   const { walletAddress, xpPoints, projectId } = req.body;
//   console.log(projectId);

//   try {
//     // 먼저 해당 프로젝트에 대해 이미 XP 클레임이 이루어졌는지 확인
//     const existingClaim = await UserPointsHistory.findOne({
//       where: {
//         wallet_addr: walletAddress,
//         project_id: projectId,
//       },
//     });

//     if (existingClaim) {
//       return res
//         .status(400)
//         .json({ message: "XP has already been claimed for this project." });
//     }

//     // 스마트 계약과 상호작용 (claimXP는 트랜잭션 발생)
//     const contract = new web3.eth.Contract(contractABI, contractAddress);

//     // 가스 추정
//     const gasEstimate = await contract.methods
//       .claimXP(walletAddress, xpPoints)
//       .estimateGas({ from: adminAddress });

//     // 트랜잭션 객체 생성
//     const tx = {
//       from: adminAddress,
//       to: contractAddress,
//       data: contract.methods.claimXP(walletAddress, xpPoints).encodeABI(),
//       gas: gasEstimate,
//       maxPriorityFeePerGas: web3.utils.toWei("2", "gwei"),
//       maxFeePerGas: web3.utils.toWei("50", "gwei"),
//     };

//     // 트랜잭션 서명 및 전송 (클레임한 XP에 대한 트랜잭션)
//     const signedTx = await web3.eth.accounts.signTransaction(
//       tx,
//       adminPrivateKey
//     );
//     const receipt = await web3.eth.sendSignedTransaction(
//       signedTx.rawTransaction
//     );

//     if (!receipt.transactionHash) {
//       return res.status(500).json({ message: "Transaction failed" });
//     }

//     // getXP 호출로 사용자의 총 XP 잔액을 가져옴
//     const xpBalanceRaw = await contract.methods.getXP(walletAddress).call();
//     const xpBalance = parseInt(xpBalanceRaw, 10);

//     if (isNaN(xpBalance)) {
//       return res.status(500).json({ message: "Failed to fetch XP balance" });
//     }

//     // 현재 XP 조회 후 클레임한 XP를 더해 업데이트
//     const user = await UserInfo.findOne({
//       where: { wallet_addr: walletAddress },
//     });
//     const currentXP = user ? user.cur_xp : 0; // 현재 XP가 없다면 0으로 설정
//     const updatedXP = currentXP + xpPoints;

//     // UserInfo 테이블에 사용자의 총 XP 잔액을 업데이트
//     await UserInfo.update(
//       { cur_xp: updatedXP }, // 클레임한 XP만 더해 총 XP 업데이트
//       { where: { wallet_addr: walletAddress } }
//     );

//     // 포인트 히스토리 테이블에 이번 클레임한 xpPoints 값 기록 (project_id 추가)
//     await UserPointsHistory.create({
//       wallet_addr: walletAddress,
//       date: moment().tz("Asia/Seoul").format("YYYY-MM-DD HH:mm:ss"),
//       participation: "Project Rating",
//       activity: "Claim XP",
//       xp_earned: xpPoints, // 이번에 클레임한 XP만 기록
//       transaction_id: receipt.transactionHash,
//       project_id: projectId, // project_id를 기록하여 중복 클레임 방지
//     });

//     res.json({ success: true, transactionHash: receipt.transactionHash });
//   } catch (error) {
//     console.error("Error processing XP claim:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// XP 잔액을 업데이트하는 API
// 프론트에서 트랜잭션 보낼 경우 아래의 API 로 XP balance 만 업데이트

const updateXPBalance = async (req, res) => {
  const { walletAddress, xpBalance } = req.body;

  try {
    // 사용자의 총 XP 잔액을 업데이트
    await UserInfo.update(
      { cur_xp: xpBalance }, // 새로운 XP 잔액으로 업데이트
      { where: { wallet_addr: walletAddress } }
    );

    res.json({ success: true, message: "XP balance updated successfully." });
  } catch (error) {
    console.error("Error updating XP balance:", error);
    res.status(500).json({ message: "Failed to update XP balance." });
  }
};

const updatePointHistory = async (req, res) => {
  const {
    walletAddress,
    date,
    participation,
    activity,
    xpEarned,
    transactionId,
    project_id, // project_id 추가
  } = req.body;

  if (!project_id) {
    return res.status(400).json({ message: "Project ID is required" });
  }

  const t = await sequelize.transaction();

  try {
    const formattedDate = moment(date)
      .tz("Asia/Seoul")
      .format("YYYY-MM-DD HH:mm:ss");

    await UserPointsHistory.create(
      {
        wallet_addr: walletAddress,
        date: formattedDate,
        participation: participation,
        activity: activity,
        xp_earned: xpEarned,
        transaction_id: transactionId,
        project_id: project_id, // project_id 필드 추가
      },
      { transaction: t }
    );

    await t.commit();
    res.json({ message: "Point history updated successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Error updating point history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// XP 잔액 업데이트 함수
const fetchAndUpdateXPBalance = async (walletAddress) => {
  try {
    const contract = new web3.eth.Contract(contractABI, contractAddress);
    const xpBalanceRaw = await contract.methods.getXP(walletAddress).call();
    const xpBalance = parseInt(xpBalanceRaw, 10);

    if (isNaN(xpBalance)) {
      throw new Error("Invalid XP balance returned");
    }

    // DB에 XP 업데이트
    await UserInfo.update(
      { cur_xp: xpBalance },
      { where: { wallet_addr: walletAddress } }
    );

    console.log(`XP balance updated in database for ${walletAddress}.`);
  } catch (error) {
    console.error("Error fetching XP balance or updating database:", error);
  }
};

const getUserPointHistory = async (req, res) => {
  const { walletAddress } = req.params;

  try {
    const pointHistory = await UserPointsHistory.findAll({
      where: { wallet_addr: walletAddress },
      order: [["date", "DESC"]],
      raw: true,
    });

    res.json(pointHistory);
  } catch (error) {
    console.error("Error fetching point history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 사용자 참여 정보와 Deal 정보 가져오기
const getUserDealInterest = async (req, res) => {
  const { user_id } = req.body;
  console.log(user_id);
  try {
    // UserDealInterest에서 해당 유저의 Deal 정보를 가져옴
    const userInterests = await UserDealInterest.findAll({
      where: { user_id },
      include: [
        {
          model: DealInfo,
          as: "deal",
          attributes: ["deal_name", "deal_status"], // 필요한 deal 정보만 가져옴
        },
      ],
    });

    // console.log(userInterests.deal[0]);

    if (!userInterests || userInterests.length === 0) {
      return res.status(404).json({ message: "No deals found for this user." });
    }

    const formattedData = userInterests.map((interest) => {
      // deal_status에 따라 user_interest 또는 user_final_alloc 값을 선택
      const isPaymentPeriod =
        interest.deal.deal_status === "PAYMENT_PERIOD" ||
        interest.deal.deal_status === "PAYMENT_VERIFY" ||
        interest.deal.deal_status === "PAYMENT_COMPLETED";

      // deal_status 변환 로직
      let statusLabel = "";
      switch (interest.deal.deal_status) {
        case "RAISING":
          statusLabel = "Interest Submitted";
          break;
        case "PAYMENT_PENDING":
          statusLabel = "Payment Pending";
          break;
        case "PAYMENT_PERIOD":
          statusLabel = "Payment Period";
          break;
        case "PAYMENT_VERIFY":
          statusLabel = "Payment Verify";
          break;
        case "PAYMENT_COMPLETED":
          statusLabel = "Payment Completed";
          break;
        case "CLOSED":
          statusLabel = "CLOSED";
          break;
        default:
          statusLabel = "Unknown Status";
          break;
      }

      return {
        deal_id: interest.deal_id,
        user_value: isPaymentPeriod
          ? interest.user_final_alloc
          : interest.user_interest, // 조건에 따라 값 설정
        deal_name: interest.deal.deal_name,
        deal_status: statusLabel, // 변환된 deal_status 값
        update_date: interest.update_date,
        participation: "Deal",
      };
    });

    const sortedData = formattedData.sort(
      (a, b) => new Date(b.update_date) - new Date(a.update_date)
    );

    return res.status(200).json(sortedData);
  } catch (error) {
    console.error("Error fetching user deal interest:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const checkAlreadyClaimed = async (req, res) => {
  const { walletAddress, project_id } = req.body;

  try {
    const existingHistory = await UserPointsHistory.findOne({
      where: { wallet_addr: walletAddress, project_id: project_id },
    });

    if (existingHistory) {
      return res.json({ alreadyClaimed: true });
    }

    return res.json({ alreadyClaimed: false });
  } catch (error) {
    console.error("Error checking claim status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateXP,
  updateXPBalance,
  fetchAndUpdateXPBalance,
  getUserPointHistory,
  updatePointHistory,
  getUserDealInterest,
  checkAlreadyClaimed,
};
