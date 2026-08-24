 

/*;=============================================   

; Author           :  Global Software's    

; Create date      :  25/01/2012

; Create By        :  ASLAM  

; Description      :  Program Requirement Calculation 

; Change Person    :  ASLAM

; Last Change Date :  03/02/2022 11.35 AM 

; =============================================  */  

CREATE PROCEDURE SP_FabReqCalc_Domestic_joborder(@Ordid int ,@StyleNo VARCHAR(25),@IPAddress VARCHAR(30) ,@JobOrder Char(1),@JobID int,@tempCalculate char(1)=0) AS

BEGIN

/*

SET @Ordid = 5609

SET @StyleNo = 'DKDKD'

SET @IPAddress ='Machine-16'

SET @JobOrder ='N'

SET @JobID =0  */



DECLARE @EntryOption AS Int,@ActPcsWt AS INT,@cntName Varchar(Max),@ConsPer Numeric(18,2),@CntName_New VARCHAR(Max),@CntID int ,

@CntLength int ,@ClrName Varchar(max),@clrName_New VARCHAR(MAX),@ClrLength INT,@FinClrID INT,@TmpClrID INT,@CLR INT ,@CLR1 INT,@FinClr INT,@FinClr1 int



DECLARE @Sql Varchar(max),@PcsFlg as BIT,@ReqPcs AS INT,@slnocol VARCHAR(MAX),@KnitWoven CHAR(1),@REQKGS NUMERIC(18,3),@REQOTH NUMERIC(18,3),@UOM CHAR(10),@PARTS int,@ReqVal AS INT =0 ,@NEW_REQ_KGS NUMERIC(18,3)



DECLARE @Yd CHAR(1), @compID INT, @ID INT, @ClrCombID INT, @FabClr INT ,@FabDesc INT, @GreyGsm INT , @FinalGsm INT, @GG INT, @LL VARCHAR(15),

@FabWid INT , @WtUom NUMERIC(18,3), @LooseFab INT, @sizid INT, @pcswgt NUMERIC(18,3), @kdia INT,@fdia INT , @ldia INT, @OrderQty INT, @Exs_Per Numeric(9,2),@compgrdslno INT, @PExc NUMERIC(9,2) ,@NoofPiece INT ,@CutPlanQty INT,@Component_Block CHAR(1),@PartId INT,@DesignID INT,@OverDyeing CHAR(1)



DECLARE @YarnDyedReq_Kgs AS NUMERIC(18,3),@YarnDyedReq_Kgs_1 AS NUMERIC(18,3), @YarnDyedReq_Kgs_ForOtherDept AS NUMERIC(18,3),@TmpYarnKgs AS NUMERIC (18,3),

@TmpKgs AS NUMERIC(18,3),@iYdLossFlg AS BIT = 0 ,@ClrLossCnt1 as INT



DECLARE @RollPrint_Deptslno AS INT =0,@Cutting_DeptSlno AS INT =0 ,@FabToYarnChkFlg BIT = 0,@FABTOYARN_LOSSPER NUMERIC(18,2),@Dyeing_FabToYarnChkFlg as BIT =0 , @DYEING_LOSSPER NUMERIC(18,2),@YARNDYEING_LOSSPER as Numeric(18,2)





/* CURSOR_4_MAIN VARIABLE DECLARATIONS */

DECLARE @Prs INT , @Loss_Per NUMERIC(18,2), @Deptname VARCHAR(50), @InputType CHAR(1), @OutputType CHAR(1), @ColEntryMust CHAR(2),@sl INT = 1 ,@DeptId INT,@SubPrsId INT,@fabtoyarn BIT =0 ,  @flg1 BIT =0, @yarndy AS BIT =0 , @flg2 BIT = 0,@YTwist AS BIT = 
0,  @pos1 INT = 0, @pos2 INT = 0, @pos3 INT = 0,@i1 INT = 0 ,@ordseq INT ,@DeptName1 Varchar(50),@DeptGrpCode INT,@YarnTwistPosition INT,@KnittingPosition INT,@DyeingPosition INT,@ClrID_Temp INT,@Loss Numeric(9,2) = 0,@ClrLossCnt INT,@DeptGrpCode1 INT



/* CURSOR 5 DECLARATIONS */

DECLARE @YCount INT , @Yclr INT,@ConsPer1 NUMERIC(18,2)



/* CURSOR_6_3 DECLARATIONS */

DECLARE @YCount_6 INT , @Yclr_6 INT,@ConsPer1_6 NUMERIC(18,2),@FabtoYarn_6 VARCHAR(20),@ProcType_6 VARCHAR(20), @ColType_6 CHAR(1)



/* CURSOR_6_4 DECLARATIONS */

DECLARE @YCount_6_4 INT , @Yclr_6_4 INT,@ConsPer1_6_4 NUMERIC(18,2)



DECLARE @ClrLossPercent Numeric(9,2) = 0, @ColorID int,@TmpYarnDyedForColType_Color_ReqKgs  AS NUMERIC(18,3) ,@SPRSID INT



/* INSERT TABLE - DECLARATIONS */



DECLARE @IpAddress_1 VARCHAR(30) ,@Prs_1 INT ,@Component_1 INT ,@clrcombo_1 INT ,@clr_1 INT ,@fabtype_1 INT,@ycount_1 INT ,@gsm_1 INT,@gg_1 INT ,@ll_1 VARCHAR(15),

@dia_1 INT ,@reqkgs_1 NUMERIC(18,3),@othuom_1 NUMERIC(18,3),@type_1 CHAR(1),
@sl_1 INT =1 ,@fdia_1 INT ,@fgsm_1 INT ,@Block_1 CHAR(1),@SubPrsID_1 INT



DECLARE @JobOrderStageWise as Char(1)



DECLARE @Ycount_10 INT ,@YClr_10 INT

/* Cursor_Shortage YARN */



DECLARE @Dept INT,@Count_ID INT,@Color_ID1 INT,@ShortKgs Numeric(18,3)



/* Cursor_Shortage FABRIC */



DECLARE @FabID INT ,@COLOR_ID_2 INT ,@COUNT_ID_2 INT ,@GSM_2 INT ,@GG_2 INT ,@LL_2 VARCHAR(15),@DiaID_2 INT ,@FinGSM_2 INT ,@FinDiaID_2 INT ,@SubPRSID_2 INT ,@Dept_2 INT,@ShortKGS_Fab Numeric(18,3),@ShortMtr_Fab NUMERIC(18,3) ,@DESIGN_ID_2 INT



/* CURSOR_MR_FABRIC */

DECLARE @SNo INT,@Dept_ID INT,@Dept_Name Varchar(50), @REQKGS_MR NUMERIC(18,3),@ShortageKGS NUMERIC(18,3),@TOTALKGS NUMERIC(18,3),@COLOUR_ID INT, @DESIGN_ID_MR INT





Delete from Prog_ReqCalTWrk WHERE ipaddress = @IPAddress and isnull(Component_Block,'N')='N'



SELECT @JobOrderStageWise = IsNull(JobOrderStageWise,'N')  From Options



/* #BaseTable1 Temp Table Creation With Required Columns */

SELECT Prog_ClrComb.Yd, Prog_ClrComb.compID, Prog_ClrComb.ID, Prog_ClrComb.ClrCombID, Prog_ClrComb.FabClr,Prog_ClrComb.FabDesc, Prog_ClrComb.GreyGsm, Prog_ClrComb.FinalGsm, Prog_ClrComb.GG, Prog_ClrComb.LL,Prog_Cns.FabWidth as FabWid, Prog_ClrComb.WtUom, 
Prog_ClrComb.LooseFab, Prog_Cns.sizid, Prog_Cns.pcswgt, Prog_Cns.kdia,Prog_Cns.fdia, Prog_Cns.ldia, OrderQtyDtl.OrderQty, OrderQtyDtl.Exs_Per,Prog_ClrComb.compgrdslno, Prog_ClrComb.PExc ,IsNull(Prog_cns.NoofPiece,1) as NoofPiece,IsNull(OrderQtyDtl.CutPlanQty,0) as CutPlanQty ,IsNull(Prog_ClrComb.Component_Block,'N') as Component_Block,Prog_ClrComb.PartId,IsNull(DesignId,0) as DesignID,IsNull(Prog_ClrComb.OverDyeing,'') as OverDyeing INTO #BaseTable1    FROM Prog_ClrComb INNER JOIN Prog_Cns ON Prog_ClrComb.ID = Prog_Cns.ID INNER JOIN OrderQtyDtl ON Prog_ClrComb.OrdID = OrderQtyDtl.OrdID AND Prog_ClrComb.StyleNo = OrderQtyDtl.StyleNo AND Prog_Cns.sizid = OrderQtyDtl.SizeId AND Prog_ClrComb.ClrCombID = OrderQtyDtl.ColID LEFT OUTER JOIN Prog_Component ON Prog_ClrComb.OrdID = Prog_Component.OrdID AND Prog_ClrComb.StyleNo = Prog_Component.StyleNo AND Prog_ClrComb.compID = Prog_Component.CompID AND Prog_ClrComb.ID = Prog_Component.sl LEFT OUTER JOIN (Select Distinct Ordid,Styleno,CombclrId,CompId,Id,PartId,ComboId,Designid From  Prog_Design WHERE OrdID =@Ordid AND StyleNo =@StyleNo ) Prog_Design ON Prog_ClrComb.ID = Prog_Design.ID And Prog_ClrComb.StyleNo = Prog_Design.StyleNo And Prog_ClrComb.ClrCombID = Prog_Design.CombClrID And Prog_ClrComb.compID = Prog_Design.CompId and Prog_ClrComb.ClrCombID = Prog_Design.ComboId  WHERE Prog_ClrComb.OrdID =@Ordid AND Prog_ClrComb.StyleNo =@StyleNo and 1 =2  order by Prog_ClrComb.compid



SELECT @EntryOption = isnull(entryoption,1) from ordermas A INNER JOIN OrderStyleDtl B ON A.Ordid = B.Ordid Where A.ordid=@ORdid And B.StyleNo=@Styleno

SET @TmpClrID = 0 

SET @CLR = 0 

SET @CLR1 = 0

SET @FinClr = 0

SET @FinClr1 = 0

SET @ClrName =''

SET @clrName_New = ''

SET @PcsFlg = 0 

SET @KnitWoven = 'K'

SET @IpAddress_1 = @IPAddress



SELECT @RollPrint_Deptslno = Sl From OrdSeq INNER JOIN Mas_Dept ON OrdSeq.Prs = Mas_Dept.DeptID Where Ordid=@ORdid 

and (Prs=10 OR IsNull(Mas_Dept.DeptGrpCode,0) = 10 )



SELECT @Cutting_DeptSlno = SL From OrdSeq Where Ordid=@Ordid and Prs=11





IF @EntryOption = 1 

BEGIN

	IF @JobOrder = 'Y'

	BEGIN

	 

	 SELECT @ActpcsWt = Count(isnull(ActPcsWgt,0)) FROM Prog_ClrComb INNER JOIN Prog_Cns ON Prog_ClrComb.ID = Prog_Cns.ID INNER JOIN OrderQtyDtl ON Prog_ClrComb.OrdID = OrderQtyDtl.OrdID AND Prog_ClrComb.StyleNo = OrderQtyDtl.StyleNo AND Prog_Cns.sizid = OrderQtyDtl.SizeId AND Prog_ClrComb.ClrCombID = OrderQtyDtl.ColID INNER JOIN Tmp_Cutting_Job as Cutting_Job ON Cutting_Job.OrdID = OrderQtyDtl.OrdID AND Cutting_Job.StyleNo = OrderQtyDtl.StyleNo INNER JOIN Tmp_Cutting_Job_Dtl as Cutting_Job_Dtl ON Cutting_Job.ID = Cutting_Job_Dtl.ID AND Cutting_Job_Dtl.Sizeid = OrderQtyDtl.SizeId AND Cutting_Job_Dtl.ColID = OrderQtyDtl.ColID  LEFT OUTER JOIN Prog_Component ON Prog_ClrComb.OrdID = Prog_Component.OrdID AND Prog_ClrComb.StyleNo = Prog_Component.StyleNo AND Prog_ClrComb.compID = Prog_Component.CompID AND Prog_ClrComb.ID = Prog_Component.sl WHERE Prog_ClrComb.OrdID =@OrdId AND Prog_ClrComb.StyleNo =@StyleNo AND Cutting_Job.ID =@JobID And (PcsWgt>0 and IsNull(ActPcsWgt,0)=0)



	 IF @ActpcsWt >0 

	 BEGIN

	      INSERT INTO #BaseTable1 SELECT X.Yd, X.compID, X.ID, X.ClrCombID, X.FabClr, X.FabDesc, X.GreyGsm, X.FinalGsm, X.GG, X.LL, X.FabWid, X.WtUom, X.LooseFab, X.sizid, X.pcswgt, X.kdia, X.fdia, X.ldia, X.OrderQty As OrderQty, X.Exs_Per, X.CompGrdSlno,  X.PExc, X.NoofPiece, X.CutPlanQty,X.Component_Block,X.PartId,X.DesignId,X.OverDyeing FROM 

		  (SELECT Distinct Prog_ClrComb.Yd, Prog_ClrComb.compID, Prog_ClrComb.ID, Prog_ClrComb.ClrCombID, Prog_ClrComb.FabClr, Prog_ClrComb.FabDesc, Prog_ClrComb.GreyGsm, Prog_ClrComb.FinalGsm, Prog_ClrComb.GG, Prog_ClrComb.LL, Prog_Cns.FABWIDTH AS FabWid, Prog_ClrComb.WtUom, Prog_ClrComb.LooseFab, Prog_Cns.sizid, Prog_Cns.pcswgt, Prog_Cns.kdia, Prog_Cns.fdia, Prog_Cns.ldia, (Cutting_Job_Dtl.OrdQty) AS OrderQty, 0 AS Exs_Per, Prog_ClrComb.CompGrdSlno,  Prog_ClrComb.PExc, ISNULL(Prog_Cns.NoofPiece, 1) AS NoofPiece, (Cutting_Job_Dtl.OrdQty-IsNull(CancelQty,0)) AS CutPlanQty,IsNull(Prog_ClrComb.Component_Block,'N') as Component_Block , OrderQtyDtl.LotNo,Prog_ClrComb.PartID,IsNull(DesignId,0) as DesignId,IsNull(Prog_ClrComb.OverDyeing,'') as OverDyeing  FROM Prog_ClrComb INNER JOIN Prog_Cns ON Prog_ClrComb.ID = Prog_Cns.ID INNER JOIN OrderQtyDtl ON Prog_ClrComb.OrdID = OrderQtyDtl.OrdID AND Prog_ClrComb.StyleNo = OrderQtyDtl.StyleNo AND Prog_Cns.sizid = OrderQtyDtl.SizeId AND Prog_ClrComb.ClrCombID = OrderQtyDtl.ColID INNER JOIN Tmp_Cutting_Job as Cutting_Job ON Cutting_Job.OrdID = OrderQtyDtl.OrdID AND Cutting_Job.StyleNo = OrderQtyDtl.StyleNo INNER JOIN Tmp_Cutting_Job_Dtl as Cutting_Job_Dtl ON Cutting_Job.Id = Cutting_Job_Dtl.ID AND Cutting_Job_Dtl.SizeID = OrderQtyDtl.SizeId AND Cutting_Job_Dtl.ColID =
 OrderQtyDtl.ColID and IsNull(Cutting_Job_Dtl.LotNo ,'')= OrderQtyDtl.LotNo And  Cutting_Job_Dtl.PartId = OrderQtyDtl.PartId LEFT OUTER JOIN Prog_Component ON Prog_ClrComb.OrdID = Prog_Component.OrdID AND Prog_ClrComb.StyleNo = Prog_Component.StyleNo AND 
Prog_ClrComb.compID = Prog_Component.CompID AND Prog_ClrComb.ID = Prog_Component.sl Left Join Prod_CutComponents On Cutting_Job.Id=Prod_CutComponents.JobId And Cutting_Job.OrdId=Prod_CutComponents.OrdId And Cutting_Job.StyleNo=Prod_CutComponents.StyleNo And Prog_ClrComb.CompId=Prod_CutComponents.CompId And Prog_ClrComb.PartId=Prod_CutComponents.PartId LEFT OUTER JOIN (Select Distinct Ordid,Styleno,CombclrId,CompId,Id,PartId,ComboId,Designid From  Prog_Design WHERE Ordid = @OrdId And StyleNo = @StyleNo) Prog_Design ON Prog_ClrComb.ID = Prog_Design.ID And Prog_ClrComb.StyleNo = Prog_Design.StyleNo And Prog_ClrComb.ClrCombID = Prog_Design.CombClrID And Prog_ClrComb.compID = Prog_Design.CompId and Prog_ClrComb.ClrCombID = Prog_Design.ComboId   WHERE (Prog_ClrComb.OrdID = @OrdId) AND (Prog_ClrComb.StyleNo = @StyleNo) AND (Cutting_Job.Id = @JobID ) And IsNull(Prog_ClrComb.Component_Block,'N')='N' ) X ORDER BY X.compID



	 END

	 ELSE

	 BEGIN

	  INSERT INTO #BaseTable1 Select X.Yd, X.compID, X.ID, X.ClrCombID, X.FabClr, X.FabDesc, X.GreyGsm, X.FinalGsm, X.GG, X.LL, X.FabWid, X.WtUom, X.LooseFab, X.sizid, X.pcswgt, X.kdia, X.fdia, X.ldia, Sum(X.OrderQty) As OrderQty, X.Exs_Per, X.CompGrdSlno,  
X.PExc, X.NoofPiece, X.CutPlanQty,X.Component_Block,X.PartId,X.DesignId,X.OverDyeing From (SELECT Distinct Prog_ClrComb.Yd, Prog_ClrComb.compID, Prog_ClrComb.ID, Prog_ClrComb.ClrCombID, Prog_ClrComb.FabClr, Prog_ClrComb.FabDesc, Prog_ClrComb.GreyGsm, Prog_ClrComb.FinalGsm, Prog_ClrComb.GG, Prog_ClrComb.LL, Prog_Cns.FABWIDTH AS FabWid, Prog_ClrComb.WtUom, Prog_ClrComb.LooseFab, Prog_Cns.sizid, isnull(ActPcsWgt,0) as pcswgt, Prog_Cns.kdia, Prog_Cns.fdia, Prog_Cns.ldia, (Cutting_Job_Dtl.OrdQty) AS OrderQty, 
0 AS Exs_Per, Prog_ClrComb.CompGrdSlno,  Prog_ClrComb.PExc, ISNULL(Prog_Cns.NoofPiece, 1) AS NoofPiece, (Cutting_Job_Dtl.OrdQty-IsNull(CancelQty,0)) AS CutPlanQty,IsNull(Prog_ClrComb.Component_Block,'N') as Component_Block , OrderQtyDtl.LotNo,Prog_ClrComb
.PartID,IsNull(DesignId,0) as DesignId,IsNull(Prog_ClrComb.OverDyeing,'') as OverDyeing  FROM Prog_ClrComb INNER JOIN Prog_Cns ON Prog_ClrComb.ID = Prog_Cns.ID INNER JOIN OrderQtyDtl ON Prog_ClrComb.OrdID = OrderQtyDtl.OrdID AND Prog_ClrComb.StyleNo = OrderQtyDtl.StyleNo AND Prog_Cns.sizid = OrderQtyDtl.SizeId AND Prog_ClrComb.ClrCombID = OrderQtyDtl.ColID INNER JOIN Tmp_Cutting_Job as Cutting_Job ON Cutting_Job.OrdID = OrderQtyDtl.OrdID AND Cutting_Job.StyleNo = OrderQtyDtl.StyleNo INNER JOIN Tmp_Cutting_Job_Dtl as Cutting_Job_Dtl ON Cutting_Job.Id = Cutting_Job_Dtl.ID AND Cutting_Job_Dtl.SizeID = OrderQtyDtl.SizeId AND Cutting_Job_Dtl.ColID = OrderQtyDtl.ColID and IsNull(Cutting_Job_Dtl.LotNo ,'')= OrderQtyDtl.LotNo And  Cutting_Job_Dtl.PartId = OrderQtyDtl.PartId LEFT OUTER JOIN Prog_Component
 ON Prog_ClrComb.OrdID = Prog_Component.OrdID AND Prog_ClrComb.StyleNo = Prog_Component.StyleNo AND Prog_ClrComb.compID = Prog_Component.CompID AND Prog_ClrComb.ID = Prog_Component.sl Left Join Prod_CutComponents On Cutting_Job.Id=Prod_CutComponents.JobId
 And Cutting_Job.OrdId=Prod_CutComponents.OrdId And Cutting_Job.StyleNo=Prod_CutComponents.StyleNo And Prog_ClrComb.CompId=Prod_CutComponents.CompId And Prog_ClrComb.PartId=Prod_CutComponents.PartId LEFT OUTER JOIN (Select Distinct Ordid,Styleno,CombclrId
,CompId,Id,PartId,ComboId,Designid From  Prog_Design WHERE Ordid = @OrdId And StyleNo = @StyleNo) Prog_Design ON Prog_ClrComb.ID = Prog_Design.ID And Prog_ClrComb.StyleNo = Prog_Design.StyleNo And Prog_ClrComb.ClrCombID = Prog_Design.CombClrID And Prog_ClrComb.compID = Prog_Design.CompId and Prog_ClrComb.ClrCombID = Prog_Design.ComboId   WHERE (Prog_ClrComb.OrdID = @OrdId) AND (Prog_ClrComb.StyleNo = @StyleNo) AND (Cutting_Job.Id = @JobID ) And IsNull(Prog_ClrComb.Component_Block,'N')='N' ) X group by X.Yd, X.compID, X.ID, X.ClrCombID, X.FabClr, X.FabDesc, X.GreyGsm, X.FinalGsm, X.GG, X.LL, X.FabWid , X.WtUom, X.LooseFab, X.sizid, X.pcswgt, X.kdia, X.fdia, X.ldia,  X.CompGrdSlno, X.PExc,X.CutPlanQty,X.NoofPiece,X.Component_Block,X.Exs_Per,X.PartId,X.DesignId,X.OverDyeing ORDER BY X.compID



	 END

	 



	END

	ELSE IF @JobOrder = 'N'

	BEGIN

	   INSERT INTO #BaseTable1 SELECT Prog_ClrComb.Yd, Prog_ClrComb.compID, Prog_ClrComb.ID, Prog_ClrComb.ClrCombID, Prog_ClrComb.FabClr,Prog_ClrComb.FabDesc, Prog_ClrComb.GreyGsm, Prog_ClrComb.FinalGsm, Prog_ClrComb.GG, Prog_ClrComb.LL,Prog_Cns.FabWidth as 
FabWid, Prog_ClrComb.WtUom, Prog_ClrComb.LooseFab, Prog_Cns.sizid, Prog_Cns.pcswgt, Prog_Cns.kdia,Prog_Cns.fdia, Prog_Cns.ldia, OrderQtyDtl.OrderQty, OrderQtyDtl.Exs_Per,Prog_ClrComb.compgrdslno, Prog_ClrComb.PExc ,IsNull(Prog_cns.NoofPiece,1) as NoofPiece,IsNull(OrderQtyDtl.CutPlanQty,0) as CutPlanQty ,IsNull(Prog_ClrComb.Component_Block,'N') as Component_Block,Prog_ClrComb.PartId,IsNull(DesignId,0) as DesignID,IsNull(Prog_ClrComb.OverDyeing,'') as OverDyeing   FROM Prog_ClrComb INNER JOIN Prog_Cns ON Prog_ClrComb.ID = Prog_Cns.ID INNER JOIN OrderQtyDtl ON Prog_ClrComb.OrdID = OrderQtyDtl.OrdID AND Prog_ClrComb.StyleNo = OrderQtyDtl.StyleNo AND Prog_Cns.sizid = OrderQtyDtl.SizeId AND Prog_ClrComb.ClrCombID = OrderQtyDtl.ColID LEFT OUTER JOIN Prog_Component ON Prog_ClrComb.OrdID = Prog_Component.OrdID AND Prog_ClrComb.StyleNo = Prog_Component.StyleNo AND Prog_ClrComb.compID = Prog_Component.CompID AND Prog_ClrComb.ID = Prog_Component.sl LEFT OUTER JOIN (Select Distinct Ordid,Styleno,CombclrId,CompId,Id,PartId,ComboId,Designid From  Prog_Design WHERE OrdID =@Ordid AND StyleNo =@StyleNo ) Prog_Design ON Prog_ClrComb.ID = Prog_Design.ID And Prog_ClrComb.StyleNo = Prog_Design.StyleNo And Prog_ClrComb.ClrCombID = Prog_Design.CombClrID And Prog_ClrComb.compID =
 Prog_Design.CompId and Prog_ClrComb.ClrCombID = Prog_Design.ComboId  WHERE Prog_ClrComb.OrdID =@Ordid AND Prog_ClrComb.StyleNo =@StyleNo  order by Prog_ClrComb.compid



	   

	END

	

END 

ELSE

BEGIN

	IF @JobOrder = 'Y'

	BEGIN

		IF @ActPcsWt >0 

		BEGIN

			INSERT INTO #BaseTable1 Select Prog_ClrComb.Yd, Prog_ClrComb.compID, Prog_ClrComb.ID, Prog_ClrComb.ClrCombID, Prog_ClrComb.FabClr, Prog_ClrComb.FabDesc, Prog_ClrComb.GreyGsm, Prog_ClrComb.FinalGsm, Prog_ClrComb.GG, Prog_ClrComb.LL, Prog_Cns.FabWidth as
 FabWid, Prog_ClrComb.WtUom, Prog_ClrComb.LooseFab, Prog_Cns.sizid, Prog_Cns.pcswgt, Prog_Cns.kdia, Prog_Cns.fdia, Prog_Cns.ldia, Sum(Cutting_Job_Dtl.OrdQty) as OrdQty, 0 as Exs_Per, Prog_ClrComb.CompGrdSlno, Prog_ClrComb.PExc,IsNull(Prog_cns.NoofPiece,1)
 as NoofPiece, Sum((Cutting_Job_Dtl.OrdQty)-IsNull(CancelQty,0)) as CutPlanQty,IsNull(Prog_ClrComb.Component_Block,'N') as Component_Block,Prog_ClrComb.PartId,IsNull(Designid,0) as DesignID,IsNull(Prog_ClrComb.OverDyeing,'') as OverDyeing FROM Tmp_Cutting_Job as Cutting_Job
 INNER JOIN Tmp_Cutting_Job_Dtl as Cutting_Job_Dtl ON Cutting_Job.Id = Cutting_Job_Dtl.Id  INNER JOIN Prog_ClrComb ON  Prog_ClrComb.OrdID = Cutting_Job.OrdID  AND Prog_ClrComb.StyleNo = Cutting_Job.StyleNo AND Cutting_Job_Dtl.PartID = Prog_ClrComb.PartID  INNER JOIN Prog_Cns ON
 Prog_ClrComb.ID = Prog_Cns.ID AND Prog_Cns.sizid = Cutting_Job_Dtl.SizeId AND Prog_ClrComb.ClrCombID = Cutting_Job_Dtl.ColID LEFT OUTER JOIN Prog_Component ON Prog_ClrComb.OrdID = Prog_Component.OrdID AND Prog_ClrComb.StyleNo = Prog_Component.StyleNo AND
 Prog_ClrComb.compID = Prog_Component.CompID AND Prog_ClrComb.ID = Prog_Component.sl AND Cutting_Job.Styleno = Prog_ClrComb.StyleNo AND Cutting_Job_Dtl.SizeID = Prog_Cns.sizid AND Cutting_Job_Dtl.ColID = Prog_ClrComb.ClrCombID AND Cutting_Job_Dtl .CmbClrID = Prog_ClrComb.OrdSheet_ClrCombID INNER JOIN Order_PartDtl ON Prog_ClrComb.PartID = Order_PartDtl.PartId And Cutting_Job_Dtl.PartID = Order_PartDtl.PartID And Order_PartDtl.Ordid = Prog_ClrComb.Ordid And Order_PartDtl.StyleNo = Prog_ClrComb.StyleNo And 
Prog_ClrComb.OrdSheet_ClrCombID = Cutting_Job_Dtl.CmbClrID LEFT OUTER JOIN (Select Distinct Ordid,Styleno,CombclrId,CompId,Id,PartId,ComboId,Designid From  Prog_Design ) Prog_Design ON Prog_ClrComb.ID = Prog_Design.ID And Prog_ClrComb.StyleNo = Prog_Design.StyleNo And Prog_ClrComb.OrdSheet_ClrCombID = Prog_Design.CombClrID And Prog_ClrComb.compID = Prog_Design.CompId and Prog_ClrComb.ClrCombID = Prog_Design.ComboId and Prog_ClrComb.PartId = Prog_Design.PartID And Cutting_Job_Dtl.PartId = Prog_Design.PartId WHERE (Prog_ClrComb.OrdID = @OrdId) AND (Prog_ClrComb.StyleNo = @StyleNo) AND (Cutting_Job.Id = @JobID ) GROUP BY Prog_ClrComb.Yd, Prog_ClrComb.compID, Prog_ClrComb.ID, Prog_ClrComb.ClrCombID, Prog_ClrComb.FabClr, Prog_ClrComb.FabDesc, Prog_ClrComb.GreyGsm, Prog_ClrComb.FinalGsm, Prog_ClrComb.GG, Prog_ClrComb.LL, Prog_Cns.FabWidth , Prog_ClrComb.WtUom, Prog_ClrComb.LooseFab, Prog_Cns.sizid, Prog_Cns.pcswgt, Prog_Cns.kdia, Prog_Cns.fdia, Prog_Cns.ldia, Prog_ClrComb.CompGrdSlno, Prog_ClrComb.PExc,IsNull(Prog_cns.NoofPiece,1) , IsNull(Prog_ClrComb.Component_Block,'N') ,Prog_ClrComb.PartId,IsNull(Designid,0),IsNull(Prog_ClrComb.OverDyeing,'') order by Prog_ClrComb.compid



		END 

		ELSE

		BEGIN

			INSERT INTO #BaseTable1 SELECT Prog_ClrComb.Yd, Prog_ClrComb.compID, Prog_ClrComb.ID, Prog_ClrComb.ClrCombID, Prog_ClrComb.FabClr, Prog_ClrComb.FabDesc, Prog_ClrComb.GreyGsm, Prog_ClrComb.FinalGsm, Prog_ClrComb.GG, Prog_ClrComb.LL, Prog_Cns.FABWIDTH AS
 FabWid, Prog_ClrComb.WtUom, Prog_ClrComb.LooseFab, Prog_Cns.sizid, isnull(ActPcsWgt,0) as pcswgt, Prog_Cns.kdia, Prog_Cns.fdia, Prog_Cns.ldia, Sum(Cutting_Job_Dtl.OrdQty) AS OrderQty, 0 AS Exs_Per, Prog_ClrComb.CompGrdSlno,  Prog_ClrComb.PExc, ISNULL(Prog_Cns.NoofPiece, 1) AS NoofPiece,(IsNull(OrderQtyDtl.CutPlanQty,0)-IsNull(CancelQty,0)) AS CutPlanQty,IsNull(Prog_ClrComb.Component_Block,'N') as Component_Block,Prog_ClrComb.PartID,IsNull(DesignId,0) as DesignId,IsNull(Prog_ClrComb.OverDyeing,'') as OverDyeing FROM Prog_ClrComb INNER JOIN Prog_Cns ON Prog_ClrComb.ID = Prog_Cns.ID INNER JOIN OrderQtyDtl ON Prog_ClrComb.OrdID = OrderQtyDtl.OrdID AND Prog_ClrComb.StyleNo = OrderQtyDtl.StyleNo AND Prog_Cns.sizid = OrderQtyDtl.SizeId And Prog_clrComb.PartID =
 OrderQtyDtl.PartID  and Prog_ClrComb.OrdSheet_ClrCombID = OrderQtyDtl.CmbClrID  INNER JOIN Tmp_Cutting_Job as Cutting_Job ON Cutting_Job.OrdID = OrderQtyDtl.OrdID AND Cutting_Job.StyleNo = OrderQtyDtl.StyleNo INNER JOIN Tmp_Cutting_Job_Dtl as Cutting_Job_Dtl ON Cutting_Job.Id = Cutting_Job_Dtl.ID AND Cutting_Job_Dtl.SizeID = OrderQtyDtl.SizeId AND Cutting_Job_Dtl.ColID = OrderQtyDtl.ColID  and Cutting_Job_Dtl.PartId = Prog_ClrComb.PartID Left Join Prod_CutComponents On Cutting_Job.Id=Prod_CutComponents.JobId And Cutting_Job.OrdId=Prod_CutComponents.OrdId And Cutting_Job.StyleNo=Prod_CutComponents.StyleNo And Prog_ClrComb.CompId=Prod_CutComponents.CompId And Prog_ClrComb.PartId=Prod_CutComponents.PartId  LEFT OUTER JOIN (Select Distinct Ordid,Styleno,CombclrId,CompId,Id,PartId,ComboId,Designid From  Prog_Design ) Prog_Design ON Prog_ClrComb.ID = Prog_Design.ID And Prog_ClrComb.StyleNo = Prog_Design.StyleNo And Prog_ClrComb.OrdSheet_ClrCombID = Prog_Design.CombClrID And Prog_ClrComb.compID = Prog_Design.CompId and Prog_ClrComb.ClrCombID = Prog_Design.ComboId and Prog_ClrComb.PartId = Prog_Design.PartID And  OrderQtyDtl.PartId = Prog_ClrComb.PartID WHERE (Prog_ClrComb.OrdID = @OrdId) AND (Prog_ClrComb.StyleNo = @StyleNo) AND (Cutting_Job.Id = @JobID) GROUP BY Prog_ClrComb.Yd, Prog_ClrComb.compID, Prog_ClrComb.ID, Prog_ClrComb.ClrCombID, Prog_ClrComb.FabClr, Prog_ClrComb.FabDesc, Prog_ClrComb.GreyGsm, Prog_ClrComb.FinalGsm, Prog_ClrComb.GG, Prog_ClrComb.LL, Prog_Cns.FABWIDTH , Prog_ClrComb.WtUom, Prog_ClrComb.LooseFab, Prog_Cns.sizid, isnull(ActPcsWgt,0), Prog_Cns.kdia, Prog_Cns.fdia, Prog_Cns.ldia,  Prog_ClrComb.CompGrdSlno, Prog_ClrComb.PExc,Prog_Cns.NoofPiece,IsNull(OrderQtyDtl.CutPlanQty,0),
IsNull(Prog_ClrComb.Component_Block,'N'),Cutting_Job_Dtl.SlNo,
Prog_ClrComb.PartID,IsNull(DesignId,0),IsNull(Cutting_Job_Dtl.CancelQty,0),
IsNull(Prog_ClrComb.OverDyeing,'') ORDER BY Prog_ClrComb.compID

		END 

	END

	ELSE IF @JobOrder ='N' 

	BEGIN

		INSERT INTO #BaseTable1 Select Prog_ClrComb.Yd, Prog_ClrComb.compID, Prog_ClrComb.ID, Prog_ClrComb.ClrCombID, Prog_ClrComb.FabClr, Prog_ClrComb.FabDesc, Prog_ClrComb.GreyGsm, Prog_ClrComb.FinalGsm, Prog_ClrComb.GG, Prog_ClrComb.LL, Prog_Cns.FabWidth as 
FabWid, Prog_ClrComb.WtUom, Prog_ClrComb.LooseFab, Prog_Cns.sizid, Prog_Cns.pcswgt, Prog_Cns.kdia, Prog_Cns.fdia, Prog_Cns.ldia, OrderQtyDtl.OrderQty, 0 as Exs_Per, Prog_ClrComb.CompGrdSlno, Prog_ClrComb.PExc,IsNull(Prog_cns.NoofPiece,1) as NoofPiece, CutPlanQty ,IsNull(Prog_ClrComb.Component_Block,'N') as Component_Block,Prog_ClrComb.PartId,IsNull(Designid,0) as DesignID,IsNull(Prog_ClrComb.OverDyeing,'') as OverDyeing FROM OrderQtyDtl INNER JOIN Prog_ClrComb ON  Prog_ClrComb.OrdID = OrderQtyDtl.OrdID  AND Prog_ClrComb.StyleNo = OrderQtyDtl.StyleNo AND OrderQtyDtl.PartID = Prog_ClrComb.PartID  INNER JOIN Prog_Cns ON Prog_ClrComb.ID = Prog_Cns.ID AND Prog_Cns.sizid = OrderQtyDtl.SizeId AND Prog_ClrComb.ClrCombID = OrderQtyDtl.ColID LEFT OUTER JOIN Prog_Component ON Prog_ClrComb.OrdID = Prog_Component.OrdID AND Prog_ClrComb.StyleNo = Prog_Component.StyleNo AND Prog_ClrComb.compID = Prog_Component.CompID AND Prog_ClrComb.ID = Prog_Component.sl AND OrderQtyDtl.Styleno = Prog_ClrComb.StyleNo AND OrderQtyDtl.SizeID = Prog_Cns.sizid AND OrderQtyDtl.ColID = Prog_ClrComb.ClrCombID AND OrderQtyDtl.CmbClrID = Prog_ClrComb.OrdSheet_ClrCombID INNER JOIN Order_PartDtl ON Prog_ClrComb.PartID = Order_PartDtl.PartId And OrderQtyDtl.PartID = Order_PartDtl.PartID And Order_PartDtl.Ordid = Prog_ClrComb.Ordid And Order_PartDtl.StyleNo = Prog_ClrComb.StyleNo And Prog_ClrComb.OrdSheet_ClrCombID = OrderQtyDtl.CmbClrID LEFT OUTER JOIN (Select Distinct Ordid,Styleno,CombclrId,CompId,Id,PartId,ComboId,Designid From  Prog_Design ) 
Prog_Design ON Prog_ClrComb.ID = Prog_Design.ID And Prog_ClrComb.StyleNo = Prog_Design.StyleNo And Prog_ClrComb.OrdSheet_ClrCombID = Prog_Design.CombClrID And Prog_ClrComb.compID = Prog_Design.CompId and Prog_ClrComb.ClrCombID = Prog_Design.ComboId and Prog_ClrComb.PartId = Prog_Design.PartID And OrderQtyDtl.PartId = Prog_Design.PartId WHERE Prog_ClrComb.OrdID =@OrdId AND Prog_ClrComb.StyleNo =@StyleNo And IsNull(Prog_ClrComb.Component_Block,'N') ='N'  order by Prog_ClrComb.compid

	END 

END





 DECLARE Cursor_1 CURSOR FOR      



   Select Yd , compID , ID , ClrCombID , FabClr ,FabDesc , GreyGsm , FinalGsm , GG , LL ,

FabWid , WtUom , LooseFab , sizid , pcswgt , kdia ,fdia , ldia , OrderQty , Exs_Per ,compgrdslno , PExc  ,NoofPiece ,CutPlanQty ,Component_Block ,PartId ,DesignID ,OverDyeing  From #BaseTable1 



   OPEN Cursor_1   

   FETCH NEXT FROM Cursor_1 INTO @Yd , @compID , @ID , @ClrCombID , @FabClr ,@FabDesc , @GreyGsm , @FinalGsm , @GG , @LL ,

@FabWid , @WtUom , @LooseFab , @sizid , @pcswgt , @kdia ,@fdia , @ldia , @OrderQty , @Exs_Per ,@compgrdslno , @PExc  ,@NoofPiece ,@CutPlanQty ,@Component_Block ,@PartId ,@DesignID ,@OverDyeing 

   WHILE @@FETCH_STATUS = 0       

   BEGIN     



   IF @NoofPiece <=0 SET @NoofPiece =1

				SET @CntName_New ='' 	

				DECLARE Cursor_2 CURSOR FOR 	

				SELECT  DISTINCT Mas_Count.CountName,Sum(consper) as consper FROM Prog_Ycns INNER JOIN Mas_Count ON Prog_Ycns.YCount =		

				Mas_Count.CountID WHERE Prog_Ycns.ID = @ID Group By Mas_Count.CountName Order By consper Desc 		

				OPEN Cursor_2 		 		

				FETCH NEXT FROM Cursor_2 INTO @CntName,@ConsPer 		

				WHILE @@FETCH_STATUS = 0 		

				BEGIN   

					if len(@CntName_New) >0 		

						SET @CntName_New  = @CntName_New + '/' + @cntName 		

					ELSE 		

					    SET @CntName_New  = @cntName  	

					FETCH NEXT From Cursor_2 INTO @cntName,@ConsPer 	

					END  	

					CLOSE CURSOR_2 		

					DEALLOCATE Cursor_2  



					SELECT @CntLength = syscolumns.length   FROM sysobjects INNER JOIN syscolumns ON sysobjects.id = syscolumns.id INNER JOIN systypes ON Syscolumns.xtype = systypes.xtype WHERE sysobjects.xtype = 'U' AND sysobjects.name = 'Mas_Count' AND syscolumns.name
 = 'CountName'

					if len(@CntName_New) > @CntLength 

					BEGIN

						SET @CntLength = len(@CntName_New)

					  SET @Sql = 'ALTER TABLE Mas_Count ALTER COLUMN CountName Varchar(' + @CntLength  + ')'

					   EXEC @Sql

					END



					SET @CntID = 0  

					SELECT @CntID = isnull(CountID,0) FROM Mas_Count WHERE CountName = @CntName_New 

				if @CntID =0  	

				BEGIN 	 

				SELECT @CntID = ISNULL(MAX(CountID), 0) + 1 FROM Mas_Count 	 

				Insert into Mas_Count(CountID,Countname,Active,countGrpID) values(@CntID,@CntName_New,'Y',1) 	

				END     



			If (@Yd = '1' And @LooseFab = 0) OR (@Yd = '' And @LooseFab > 0) OR (@Yd = '1' And @LooseFab > 0)

			BEGIN 

				SET @clrName_New =''

				DECLARE Cursor_3 CURSOR FOR 	

				SELECT Mas_Color.ColorDesc FROM Prog_Ycns INNER JOIN Mas_Color ON Prog_Ycns.Yclr = Mas_Color.ColID WHERE Prog_Ycns.ID = @ID 

				  ORDER BY Consper desc,isnull(slno,0)		

				OPEN Cursor_3 		 		

				FETCH NEXT FROM Cursor_3 INTO @clrName

				WHILE @@FETCH_STATUS = 0 		

				BEGIN   

					if len(@clrName_New) >0 		

						SET @clrName_New  = @clrName_New + '/' + @clrName 		

					ELSE 		

					    SET @clrName_New  = @clrName  	

					FETCH NEXT From Cursor_3 INTO @clrName 	

					END  	

					CLOSE CURSOR_3 		

					DEALLOCATE Cursor_3  



					SELECT @ClrLength = syscolumns.length   FROM sysobjects INNER JOIN syscolumns ON sysobjects.id = syscolumns.id INNER JOIN systypes ON Syscolumns.xtype = systypes.xtype WHERE sysobjects.xtype = 'U' AND sysobjects.name = 'Mas_Color' AND syscolumns.name
 = 'ColorDesc'

					if len(@clrName_New) > @ClrLength

					BEGIN

						SET @ClrLength = len(@clrName_New)

					  SET @Sql = 'ALTER TABLE Mas_Color ALTER COLUMN COLORDESC Varchar(' + @ClrLength  + ')'

					   EXEC @Sql

					END



					SELECT  @TmpClrID =  Mas_Color.ColID FROM Prog_Ycns INNER JOIN Mas_Color ON Prog_Ycns.Yclr = Mas_Color.ColID WHERE Prog_Ycns.ID = @ID and Prog_Ycns.Yclr <> @TmpClrID ORDER BY Consper desc 



 

					SET @FinClrID = 0  

					SELECT @FinClrID = isnull(ColID,0) FROM Mas_Color WHERE ColorDesc = @clrName_New 

				if @FinClrID =0  	

				BEGIN 	 

				SELECT @FinClrID = ISNULL(MAX(ColID), 0) + 1 FROM Mas_Color 	 

				Insert into Mas_Color(Colid,Colordesc,Active) values(@FinClrID,@clrName_New,'Y') 	

				END   

				ELSE

				BEGIN

					SET @CLR = @FinClrID

					SET @CLR1 = @FinClrID

				END   



				SET @FinClr = @CLR

				SET @FinClr1 = @CLR1



				END

			ELSE

			BEGIN

				SET @CLR = @FabClr

				SET @CLR1 = @FabClr



				SET @FinClr = @CLR

				SET @FinClr1 = @CLR1

			END



			If (@Yd = '1' And @OverDyeing = '1') 

			BEGIN

				SET @CLR1 = @FabClr

				SET @FinClr1 = @CLR1

				Update Prog_ClrComb Set FinCol = @FinClr1,  FinCnt = @CntID Where ID = @ID

			END

			ELSE

			BEGIN

				Update Prog_ClrComb Set FinCol = @FinClr,  FinCnt = @CntID Where ID = @ID

			END





			SET @PcsFlg = 0

			SET @ReqPcs	= @CutPlanQty

			SET @slnocol = ''



			select @slnocol =  isNull(stuff(( select ',' + Rtrim(ID)	from (Select Distinct ID From Prog_ClrComb where Ordid = @ORdid And Styleno =@StyleNo And CompID = @CompID AND CompGrdSlno = @compgrdslno  ) x for xml path('')),1,1,''),'')



			 Select TOP 1 @KnitWoven = KnitWoven from Prog_Component where sl in (Select Distinct ID From Prog_ClrComb where Ordid = @ORdid And Styleno =@StyleNo And CompID = @CompID AND CompGrdSlno = @compgrdslno)



			 SELECt @PARTS = PArts from Prog_Component where sl in (Select Distinct ID From Prog_ClrComb where Ordid = @ORdid And Styleno =@StyleNo And CompID = @CompID AND CompGrdSlno = @compgrdslno)



			 SET @pcswgt = ISNULL(@pcswgt,0)



			 if @KnitWoven ='K' 

			 BEGIN

				SELECT @REQKGS = @ReqPcs * @pcswgt / 1000

				SELECT @UOM = UPPER(Mas_Uom.Uom) FROM Mas_Fabric INNER JOIN Mas_Uom ON dbo.Mas_Fabric.PriUomID = Mas_Uom.UomID WHERE Mas_Fabric.FabID =						@FabDesc  

				SET @REQOTH = 0

				if @UOM = 'PCS' 

				BEGIN

				SELECT @REQOTH = CONVERT( int,((@ReqPcs + @ReqPcs * @PExc / 100)))

                        

                SELECT @REQKGS = @REQOTH * @pcswgt / 1000





                SET @PcsFlg = 1

				END

			 END 

			 ELSE

			 BEGIN

				SELECT @REQOTH = @ReqPcs * @pcswgt

				SELECT @REQKGS = @REQOTH * @Wtuom

				 

			 END



			 SELECT  @REQOTH = @REQOTH * @PARTS

			 SELECT  @REQKGS = @REQKGS * @PARTS

			  



			 DECLARE CURSOR_4_MAIN CURSOR FOR 	

				SELECT Prog_Prsloss.Prs, Prog_Prsloss.Loss_Per, Mas_Dept.Deptname, Mas_Dept.InputType, Mas_Dept.OutputType, Mas_Dept.ColEntryMust,ordseq.sl,Mas_Dept.DeptId,IsNull(Prog_PrsLoss.SubPrsId,0) AS SubPrsId FROM OrdSeq INNER JOIN Prog_Prsloss ON OrdSeq.Prs =
 Prog_Prsloss.Prs INNER JOIN Mas_Dept ON Prog_Prsloss.Prs = Mas_Dept.DeptID WHERE OrdSeq.OrdID =@Ordid  AND Prog_Prsloss.ID = @ID  and InputType<>'P' ORDER BY dbo.OrdSeq.sl DESC

					

				OPEN CURSOR_4_MAIN

				FETCH NEXT FROM CURSOR_4_MAIN INTO @Prs, @Loss_Per, @Deptname, @InputType, @OutputType, @ColEntryMust,@sl,@DeptId,@SubPrsId

				WHILE @@FETCH_STATUS = 0 		

				BEGIN   

					 SET @fabtoyarn = 0 ; SET @flg1 = 0 ; SET @yarndy = 0 ; SET @flg2 = 0; SET @YTwist =0

					 SET @pos1 = 0 ; SET @pos2 = 0 ; SET @pos3 = 0; SET @i1 = 1

					 SELECT @DeptGrpCode1 = isnull(DeptGrpCode,0) From MAS_DEPT Where DeptName=@Deptname



					 DECLARE CURSOR_4_SUB CURSOR FOR

						SELECT Mas_Dept.Deptname FROM Prog_Prsloss INNER JOIN OrdSeq ON Prog_Prsloss.Prs = OrdSeq.Prs INNER JOIN Mas_Dept ON Prog_Prsloss.Prs					= Mas_Dept.DeptID WHERE Prog_Prsloss.ID =@ID  AND OrdSeq.OrdID = @Ordid  and InputType<>'P' ORDER BY OrdSeq.sl
 

						OPEN CURSOR_4_SUB

						FETCH NEXT FROM CURSOR_4_SUB INTO @DeptName1

						WHILE @@FETCH_STATUS = 0 		

						BEGIN   

							SELECT @DeptGrpCode = isnull(DeptGrpCode,0) From MAS_DEPT Where DeptName=@Deptname1



							If @Deptname1 = 'FABRIC TO YARN' 

							BEGIN

								SET @pos1 = @i1 ; SET @fabtoyarn = 1

							END

							IF @Deptname1 = 'YARN DYEING'   OR @DeptGrpCode = 2 

							BEGIN

								SET @pos2 = @i1 ; SET @yarndy = 1

							END



							IF @Deptname1 = 'YARN TWISTING'

							BEGIN

							  SET @YTwist = 1 ; SET @YarnTwistPosition = @i1

							END 



							IF @Deptname1 = 'KNITTING' OR @DeptGrpCode = 4

							BEGIN

							   SET @KnittingPosition = @i1

							END 

							if @DeptName1 = @Deptname 

							BEGIN

								SET @pos3 = @i1

								if @Deptname = 'DYEING' OR @DeptGrpCode = 8 

								SET @DyeingPosition = @i1

							END 

							SET @i1 = @i1 + 1

						FETCH NEXT FROM CURSOR_4_SUB INTO @DeptName1

						END

						CLOSE CURSOR_4_SUB

						DEALLOCATE CURSOR_4_SUB



				



				if @fabtoyarn = 1

				BEGIN

					if @pos3 > @pos1

						SET @flg1 = 1  /*Take collar fabric  */

					ELSE

						SET @flg1 = 0 /* Take Loose fabric*/

				END

				IF @yarndy =1 

				BEGIN

					if @pos3 > @Pos2

						SET @flg2 =1   /* Take Yarn dyeing collar */

					ELSE

						SET @flg2 =0  /* Dont take Yarn dyeing colour  */

				END 



				if @yarndy =0

					BEGIN

						SELECT @ClrLossCnt = COUNT(1) From Prog_Clrloss Where OrdId=@Ordid And Yd=IIf(@yarndy = 1, 1, 0) And ClrId=@clr

						SELECT @Loss = isNull(Loss,0) From Prog_Clrloss Where OrdId=@Ordid And Yd=IIf(@yarndy = 1, 1, 0) And ClrId=@clr

						SET @ClrID_Temp = @CLR

					END

				ELSE

					BEGIN

						SELECT @ClrLossCnt = COUNT(1) From Prog_Clrloss Where OrdId=@Ordid And Yd=IIf(@yarndy = 1, 1, 0) And ClrId=@TmpClrID

						SELECT @Loss = isNull(Loss,0) From Prog_Clrloss Where OrdId=@Ordid And Yd=IIf(@yarndy = 1, 1, 0) And ClrId=@TmpClrID

						SET @ClrID_Temp = @TmpClrID

					END



				IF @ClrLossCnt > 0 AND (@Prs = 2 OR @Prs = 8 OR @DeptGrpCode1 = 2)

				BEGIN

					if @Prs = 8

					BEGIN

						SELECT @REQKGS = (@reqkgs / (100 - @Loss)) * 100

						 

						IF @PcsFlg = 0 and @REQOTH > 0 

						BEGIN

							SELECT @REQOTH = (@REQOTH / (100 - @Loss)) * 100

						END

					END

				END

				ELSE

				BEGIN

					 If @Loss_Per > 0 

					 BEGIN

						SELECt @reqkgs = (@REQKGS / (100 - @Loss_Per)) * 100

						 

						SET  @iYdLossFlg = 1

					 END

					 ELSE

					 BEGIN

						SELECT @TmpKgs = @REQKGS ; SET  @iYdLossFlg = 0

					 END



					IF @PcsFlg = 0 and @REQOTH > 0 

					BEGIN

						SELECT @REQOTH = (@REQOTH / (100 - @Loss_Per)) * 100

					END

				END

			 



				IF @OutputType = 'F' AND (@DeptName <> 'DYEING' AND @DeptGrpCode1 <> 8) AND (@DeptId <> 4 ANd @DeptGrpCode1 <> 4)

				BEGIN

					If @pos3 > @DyeingPosition And @pos3 < @pos1  /* This Condition for Middle process of DYEING and FABRIC TO YARN -> By Aslam on 19-																			Mar-2012 -PKF- To be Check */

					BEGIN

						DECLARE CURSOR_5 CURSOR FOR 	

						SELECT YCount, Yclr, ConsPer FROM Prog_Ycns WHERE ID =@ID And  isnull(FabtoYarn,'No')='Yes'

						OPEN CURSOR_5

						FETCH NEXT FROM CURSOR_5 INTO @YCount, @Yclr, @ConsPer1

						WHILE @@FETCH_STATUS = 0 		

						BEGIN   

							

							if @fabtoyarn = 1

							BEGIN

								IF @flg1 = 1

									SET @fabtype_1 = @FabDesc

								ELSE

									SET @fabtype_1 = @LooseFab

							END

							ELSE	

								SET @fabtype_1 = @FabDesc



							

							IF @NoofPiece > 1	

								BEGIN

									SET @reqkgs_1 =  (@REQKGS * @ConsPer1 / 100) / @NoofPiece

									 

								END

							ELSE

							BEGIN

								SET @REQKGS_1 =  (@REQKGS * @ConsPer1 / 100) 

								 

							END



							SET @othuom_1 =0 

							SET @type_1 ='F'

							SET @sl_1 = @sl_1 

							

							Insert into Prog_ReqCalTWrk (IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,dia,reqkgs,othuom,ordid,styleno,

							type,sl,FinDiaId,FinGSM,Component_Block,SubPrsID) Values	

									(@IpAddress_1,@Prs,@compID,@ClrCombID,@Yclr,@fabtype_1,@YCount,@GreyGsm,@gg,@ll,@ldia,
@reqkgs_1,

							@othuom_1,@ordid,@styleno,@type_1,@sl_1,@ldia,@finalGsm,@Component_Block,@SubPrsID)



							SET @sl_1 = @sl_1 +1

							FETCH NEXT FROM CURSOR_5 INTO @YCount, @Yclr, @ConsPer1

						END

						CLOSE CURSOR_5  

						DEALLOCATE CURSOR_5 

					END

				ELSE

				  BEGIN

				 IF @pos3 > @KnittingPosition And @pos3 < @DyeingPosition And @pos3 < @pos1 /* ''Aslam on 24-Sep-2019 

													- for Triknit 52/19-		  Mercerising - Count Worng - Newly added this Els Condition */

					BEGIN

						 DECLARE CURSOR_5_1 CURSOR FOR 	

						SELECT YCount, Yclr, ConsPer FROM Prog_Ycns WHERE ID =@ID And  isnull(FabtoYarn,'No')='Yes'

						OPEN CURSOR_5_1

						FETCH NEXT FROM CURSOR_5_1 INTO @YCount, @Yclr, @ConsPer1

						WHILE @@FETCH_STATUS = 0 		

						BEGIN   

							SET @clr_1 = 0



							if @fabtoyarn = 1

							BEGIN

								IF @flg1 = 1

									SET @fabtype_1 = @FabDesc

								ELSE

									SET @fabtype_1 = @LooseFab

							END

							ELSE	

								SET @fabtype_1 = @FabDesc



							

							IF @NoofPiece > 1	

							BEGIN

								SET @reqkgs_1 =  (@REQKGS * @ConsPer1 / 100) / @NoofPiece

								 

							END

							ELSE

							BEGIN

								SET @REQKGS_1 =  (@REQKGS * @ConsPer1 / 100) 

								 

							END

							SET @othuom_1 =0 

							SET @type_1 ='F'

							SET @sl_1 = @sl_1 

							

							Insert into Prog_ReqCalTWrk (IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,dia,reqkgs,othuom,

							ordid,styleno,type,sl,FinDiaId,FinGSM,Component_Block,SubPrsId) Values	



							(@IpAddress,@Prs,@CompID,@ClrCombID,@clr_1,@fabtype_1,@ycount,@GreyGsm,@gg,@ll,@ldia,@reqkgs,

							@othuom_1,@ordid,@styleno,@type_1,@sl_1,@ldia,@finalGsm,@Component_Block,@SubPrsId)



							SET @sl_1 = @sl_1 +1

							FETCH NEXT FROM CURSOR_5_1 INTO @YCount, @Yclr, @ConsPer1

						END

						CLOSE CURSOR_5_1  

						DEALLOCATE CURSOR_5_1 



					END

					ELSE

					BEGIN

						 If @DeptId <> 11 And (@sl >= @RollPrint_Deptslno And @sl <= @Cutting_DeptSlno) 

						 BEGIN

								If SUBSTRING(@ColEntryMust, 1, 1) = 'Y'

								BEGIN

									IF @OverDyeing = '1' 

										SET @clr_1 = @CLR1

									ELSE

										SET @clr_1 = @CLR

								END 

								ELSE

								BEGIN

									IF @Yd ='1'  AND @LooseFab = 0

									BEGIN

										IF @OverDyeing = '1'

											SET @clr_1 = @CLR1

										ELSE

											SET @clr_1 = @CLR

									END 

									ELSE

										SET @clr_1 = 0

								END

							IF @fabtoyarn = 1 

							BEGIN

								if @flg1 = 1

									SET @fabtype_1 = @FabDesc 

								ELSE

									SET @fabtype_1 = @LooseFab 

							END

							ELSE

								SET @fabtype_1 = @FabDesc 





							IF @KnitWoven ='K'

							BEGIN

								IF @fabtoyarn = 1

								BEGIN

									if @flg1 =1 

									BEGIN

										SET @dia_1 = @kdia

										SET @fdia_1 = @fdia

									END

									ELSE

									BEGIN

										SET @dia_1 = @ldia

										SET @fdia_1 = @ldia

									END

								END

							END

							ELSE

							BEGIN

								SET @dia_1 = @FabWid

								SET @fdia_1 = @FabWid

							END



							if @NoofPiece >1

							BEGIN

								SET @reqkgs_1 = @REQKGS / @NoofPiece

								 

								SET @othuom_1 = @REQOTH / @NoofPiece

							END 

							ELSE

							BEGIN

								SET @reqkgs_1 = @REQKGS 

								 

								SET @othuom_1 = @REQOTH 

							END

							SET @type_1 ='F'

							SET @sl_1 = @sl_1 

							SET @ycount_1 = @CntID



							Insert into Prog_ReqCalTWrk(IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,dia,reqkgs,othuom,ordid,styleno,type,

							sl,FinDiaId,FinGSM,Component_Block,DesignId,SubPrsID) Values					

								(@IpAddress_1,@Prs,@CompID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@GreyGsm,@gg,@ll,@dia_1,@reqkgs_1,

							@othuom_1,@ordid,@styleno,@type_1,@sl_1,@fdia_1,@finalGsm,@Component_Block,@DesignId,@SubPrsID)

						 END

						 ELSE

						 BEGIN

							 If SUBSTRING(@ColEntryMust, 1, 1) = 'Y'

								BEGIN

									IF @OverDyeing = '1' 

										SET @clr_1 = @CLR1

									ELSE

										SET @clr_1 = @CLR

								END 

								ELSE

								BEGIN

									IF @Yd ='1'  AND @LooseFab = 0

									BEGIN

										IF @OverDyeing = '1'

											SET @clr_1 = @CLR1

										ELSE

											SET @clr_1 = @CLR

									END 

									ELSE

										SET @clr_1 = 0

								END

							IF @fabtoyarn = 1 

							BEGIN

								if @flg1 = 1

									SET @fabtype_1 = @FabDesc 

								ELSE

									SET @fabtype_1 = @LooseFab 

							END

							ELSE

								SET @fabtype_1 = @FabDesc 





							IF @KnitWoven ='K'

							BEGIN

								IF @fabtoyarn = 1

								BEGIN

									if @flg1 =1 

									BEGIN

										SET @dia_1 = @kdia

										SET @fdia_1 = @fdia

									END

									ELSE

									BEGIN

										SET @dia_1 = @ldia

										SET @fdia_1 = @ldia

									END

								END

							END

							ELSE

							BEGIN

								SET @dia_1 = @FabWid

								SET @fdia_1 = @FabWid

							END



							if @NoofPiece >1

							BEGIN

								SET @reqkgs_1 = @REQKGS / @NoofPiece

								 

								SET @othuom_1 = @REQOTH / @NoofPiece

							END 

							ELSE

							BEGIN

								SET @reqkgs_1 = @REQKGS 

								 

								SET @othuom_1 = @REQOTH 

							END

							SET @type_1 ='F'

							SET @sl_1 = @sl_1 

							SET @ycount_1 = @CntID

							Insert into Prog_ReqCalTWrk(IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,dia,reqkgs,othuom,ordid,styleno,type,

							sl,FinDiaId,FinGSM,Component_Block,SubPrsID) Values					

								(@IpAddress_1,@Prs,@CompID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@GreyGsm,@gg,@ll,@dia_1,@reqkgs_1,

							@othuom_1,@ordid,@styleno,@type_1,@sl_1,@fdia_1,@finalGsm,@Component_Block,@SubPrsID)



							SET @sl_1 = @sl_1 +1

						 END

					END

				END

				END

				ELSE

				BEGIN

					IF @OutputType ='F' AND (@DeptName ='DYEING' OR @DeptGrpCode1 = 8 ) AND @fabtoyarn = 0 

					BEGIN

						IF @OverDyeing ='1'

							SET @clr_1 = @CLR1

						ELSE

							SET @clr_1 = @CLR

						

						SET @ycount_1 = @CntID

						IF @KnitWoven = 'K'

							SET @dia_1 = @kdia 

						ELSE

							SET @dia_1 = @FabWid

						

						if @NoofPiece >1

						BEGIN

							SET @reqkgs_1 = @REQKGS / @NoofPiece

							 

							SET @othuom_1 = @REQOTH / @NoofPiece

						END 

						ELSE

						BEGIN

							SET @reqkgs_1 = @REQKGS 

							 

							SET @othuom_1 = @REQOTH 

						END

						SET @type_1 ='F'

						SET @sl_1 = @sl_1 



						IF @KnitWoven = 'K'

							SET @fdia_1 = @fdia 

						ELSE

							SET @fdia_1 = @FabWid



						Insert into Prog_ReqCalTWrk(IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,dia,reqkgs,othuom,ordid,styleno,type,

						sl,FinDiaId,FinGSM,Component_Block,SubPrsId) Values						

								(@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@GreyGsm,@gg,@ll,@dia_1,@reqkgs_1,

									@othuom_1,@ordid,@styleno,@type_1,@sl_1,@fdia_1,@finalGsm,@Component_Block,@SubPrsId)



						SET @sl_1 = @sl_1 +1



					END

					ELSE

					BEGIN

						IF @OutputType ='F' AND (@DeptId =4 OR @DeptGrpCode1 = 4 ) AND @fabtoyarn = 0

						BEGIN

							IF @Yd = 1

								SET @clr_1 = @CLR

							ELSE

								SET @clr_1 = 0 



							SET @fabtype_1 = @FabDesc 

							SET @ycount_1 = @CntID 

							IF @KnitWoven ='K'

								SET @dia_1 = @kdia

							ELSE

								SET @dia_1 = @FabWid



							if @NoofPiece >1

							BEGIN

								SET @reqkgs_1 = @REQKGS / @NoofPiece

								 

								SET @othuom_1 = @REQOTH / @NoofPiece

							END 

							ELSE

							BEGIN

								SET @reqkgs_1 = @REQKGS 

								 

								SET @othuom_1 = @REQOTH 

							END

							SET @type_1 ='F'

							SET @sl_1 = @sl_1 

							IF @KnitWoven ='K'

								SET @fdia_1 = @fdia

							ELSE

								SET @fdia_1 = @FabWid



							Insert into Prog_ReqCalTWrk(IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,dia,reqkgs,othuom,ordid,styleno,type,

							sl,FinDiaId,FinGSM,Component_Block,SubPrsId) Values						

								(@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@GreyGsm,@gg,@ll,@dia_1,@reqkgs_1,

									@othuom_1,@ordid,@styleno,@type_1,@sl_1,@fdia_1,@finalGsm,@Component_Block,@SubPrsId)



							SET @sl_1 = @sl_1 +1



						END

						ELSE

							BEGIN

								IF  @OutputType ='F' AND (@DeptId =4 OR @DeptGrpCode1 = 4 ) AND @fabtoyarn = 1

								BEGIN

						            DECLARE CURSOR_6_1 CURSOR FOR 	

									SELECT YCount, Yclr, ConsPer FROM Prog_Ycns WHERE ID =@ID And  isnull(FabtoYarn,'No')='Yes'

									OPEN CURSOR_6_1

									FETCH NEXT FROM CURSOR_6_1 INTO @YCount, @Yclr, @ConsPer1

									WHILE @@FETCH_STATUS = 0 		

									BEGIN   

										SET @clr_1 = 0

										SET @fabtype_1 = @LooseFab

										SET @ycount_1 = @YCount 

										IF @KnitWoven = 'K'

										BEGIN

											SET @dia_1 = @ldia 

											SET @fdia_1 = @ldia 

										END

										ELSE

										BEGIN

											SET @dia_1 = @FabWid 

											SET @fdia_1 = @FabWid

										END 



										if @NoofPiece >1

											BEGIN

												SET @reqkgs_1 = (@REQKGS * @ConsPer1 /100 )/ @NoofPiece

												 

											END

										ELSE

										BEGIN

											SET @reqkgs_1 = @REQKGS  * @ConsPer1 /100 

											 

										END

										SET @othuom_1 = 0

										SET @type_1 ='F'

										SET @sl_1 = @sl_1 



										Insert into Prog_ReqCalTWrk(IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,dia,reqkgs,othuom,

										ordid,styleno,type,sl,FinDiaId,FinGSM,Component_Block,SubPrsID) Values			 

										  (@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@GreyGsm,@gg,@ll,@dia_1,@reqkgs_1,

											@othuom_1,@ordid,@styleno,@type_1,@sl_1,@fdia_1,@finalGsm,@Component_Block,@SubPrsID)



										SET @sl_1 = @sl_1 + 1



										FETCH NEXT FROM CURSOR_6_1 INTO @YCount, @Yclr, @ConsPer1

										

									END

									CLOSE CURSOR_6_1

									DEALLOCATE CURSOR_6_1



								END

								ELSE

								BEGIN

									IF @OutputType ='F' AND (@Deptname = 'DYEING' OR @DeptGrpCode1 = 8) AND @fabtoyarn = 1 

									BEGIN

									 DECLARE CURSOR_6_2 CURSOR FOR 	

									SELECT YCount, Yclr, ConsPer FROM Prog_Ycns WHERE ID =@ID And  isnull(FabtoYarn,'No')='Yes'

									OPEN CURSOR_6_2

									FETCH NEXT FROM CURSOR_6_2 INTO @YCount, @Yclr, @ConsPer1

									WHILE @@FETCH_STATUS = 0 		

									BEGIN   

										SET @clr_1 = @Yclr

										SET @fabtype_1 = @LooseFab

										SET @ycount_1 = @YCount 

										IF @KnitWoven = 'K'

										BEGIN

											SET @dia_1 = @ldia 

											SET @fdia_1 = @ldia 

										END

										ELSE

										BEGIN

											SET @dia_1 = @FabWid 

											SET @fdia_1 = @FabWid

										END 



										if @NoofPiece >1

											BEGIN

												SET @reqkgs_1 = (@REQKGS * @ConsPer1 /100 )/ @NoofPiece

												 

											END

										ELSE

										BEGIN

											SET @reqkgs_1 = @REQKGS  * @ConsPer1 /100 

											 

										END

										SET @othuom_1 = 0

										SET @type_1 ='F'

										SET @sl_1 = @sl_1 



										Insert into Prog_ReqCalTWrk(IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,dia,reqkgs,othuom,

										ordid,styleno,type,sl,FinDiaId,FinGSM,Component_Block,SubPrsID) Values			 

										  (@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@GreyGsm,@gg,@ll,@dia_1,@reqkgs_1,

											@othuom_1,@ordid,@styleno,@type_1,@sl_1,@fdia_1,@finalGsm,@Component_Block,@SubPrsID)



										SET @sl_1 = @sl_1 + 1



										FETCH NEXT FROM CURSOR_6_2 INTO @YCount, @Yclr, @ConsPer1

										

									END

									CLOSE CURSOR_6_2

									DEALLOCATE CURSOR_6_2

									END

									ELSE

									BEGIN

										IF @OutputType ='Y' 

										BEGIN

											if (Select Count(*) from Prog_Prsloss A INNER JOIN Mas_Dept B ON A.Prs= B.DeptID Where ID=@ID and DeptName='FABRIC TO YARN' and Loss_Per > 0 ) >0

											BEGIN

												SET @FabToYarnChkFlg = 1

												SELECT @FABTOYARN_LOSSPER = isnull(Loss_Per,0) from Prog_Prsloss A INNER JOIN Mas_Dept B ON A.Prs= B.DeptID																				Where ID=@ID and DeptName='FABRIC TO YARN' and Loss_Per > 0 

											END

											ELSE

											BEGIN

												SET @FabToYarnChkFlg = 0

												SELECT @FABTOYARN_LOSSPER = 0

											END 



											if (Select Count(*) from Prog_Prsloss A INNER JOIN Mas_Dept B ON A.Prs= B.DeptID Where ID=@ID and DeptName='FABRIC TO YARN' ) >0

											BEGIN

												SET @Dyeing_FabToYarnChkFlg = 1

												SELECT @DYEING_LOSSPER= isnull(Loss_Per,0) from Prog_Prsloss A INNER JOIN Mas_Dept B ON A.Prs= B.DeptID																				Where ID=@ID and DeptName='DYEING' and Loss_Per > 0 

											END

											ELSE

											BEGIN

												SET @Dyeing_FabToYarnChkFlg = 0

												SELECT @DYEING_LOSSPER= 0

											END 



											IF (Select Count(*) from Prog_Prsloss A INNER JOIN Mas_Dept B ON A.Prs= B.DeptID Where ID=@ID and DeptName='YARN DYEING') > 0

												SELECT @YARNDYEING_LOSSPER = isnull(Loss_Per,0) from Prog_Prsloss A INNER JOIN Mas_Dept B ON A.Prs= B.DeptID Where ID=@ID  and DeptName='YARN DYEING' and Loss_Per > 0 

											ELSE

												SELECT @YARNDYEING_LOSSPER = 0



											

											DECLARE CURSOR_6_3 CURSOR FOR 	

											SELECT YCount, Yclr, ConsPer,isnull(FabToYarn,'No') as FabtoYarn,ProcType ,IsNull(ColType,'C') as ColType FROM Prog_Ycns LEFT OUTER JOIN Mas_Color ON YClr = ColId WHERE ID =@ID

											OPEN CURSOR_6_3

											FETCH NEXT FROM CURSOR_6_3 INTO @YCount_6, @Yclr_6, @ConsPer1_6,@FabtoYarn_6,@ProcType_6,@ColType_6

											WHILE @@FETCH_STATUS = 0 		

											BEGIN   



											If (select 1 from MAs_count where type='T' and countid= @YCount_6) > 0 And 

																@YTwist = 1 And @Deptname <> 'YARN TWISTING' And @Deptname <> 'CONE WINDING' 

											BEGIN



												DECLARE CURSOR_6_4 CURSOR FOR 

											select cntid as Ycount,colid as Yclr, wgtPer as ConsPer from  prog_ytwist_MAS MAs (nolock) inner join																prog_ytwist_Dtl Dtl on MAs.id=Dtl.id where Ordid=@Ordid and Styleno =  @StyleNo And																			Mas.TwistCntId= @YCount_6 

											OPEN CURSOR_6_4

											FETCH NEXT FROM CURSOR_6_4 INTO @YCount_6_4, @Yclr_6_4, @ConsPer1_6_4

											WHILE @@FETCH_STATUS = 0 		

											BEGIN  

												SET @ReqVal = 0 



												IF NOT (@Deptname = 'FABRIC TO YARN' OR @Deptname ='YARN DYEING' OR @DeptGrpCode1 = 2)

												BEGIN

													IF @yarndy = 1 

													BEGIN

														if @flg2 = 1

															SET @clr_1 = @Yclr_6_4

														ELSE

															SET @clr_1 = 0 

													END

													ELSE

													BEGIN

														SET @clr_1 = 0 

													END 

												END

												ELSE

												BEGIN

													IF @Deptname ='YARN DYEING' OR @DeptGrpCode1 = 2 

													BEGIN

														IF @Pos2 > @YarnTwistPosition

															SET @clr_1 = @Yclr_6_4

														ELSE

															SET @clr_1 = @Yclr_6

													END 

													ELSE

														SET @clr_1 = @Yclr_6

												END

												SET @fabtype_1 = 0 



													IF @Deptname ='YARN DYEING' OR @DeptGrpCode1 = 2 

													BEGIN

														IF @Pos2 > @YarnTwistPosition

															SET @ycount_1= @YCount_6

														ELSE

															SET @ycount_1 = @Yclr_6_4

													END 

													ELSE

														SET @ycount_1 = @YCount_6_4





														SET @gsm_1 = 0

														SET @gg_1  = 0 

														SET @ll_1 = ''

														SET @dia_1 = 0



														if @FabToYarnChkFlg = 1 AND @FabtoYarn_6 = 'NO' and (@Deptname ='YARN DYEING' OR @DeptGrpCode1 =2 )

														BEGIN

															SET @YarnDyedReq_Kgs = @REQKGS * (100 - @FABTOYARN_LOSSPER) / 100

															 

														END

														ELSE

															BEGIN

																IF @pos3 < @YarnTwistPosition

																BEGIN

																	IF  (SELECT  COUNT(1) FROM Mas_Count WHERE  type='S' and countid= @YCount_6_4) >0

																	BEGIN

																		If (Select count(1) From Prog_YTwist_Mas A INNER JOIN	Prog_YTwist_Dtl B ON A.ID =																					B.ID Where A.Ordid=@Ordid and Styleno=@StyleNo and CntID=@YCount_6_4) > 0 

																		BEGIN

																			SET @YarnDyedReq_Kgs = (@REQKGS * @ConsPer1_6 /100) / @NoofPiece

																			 

																		END

																		ELSE

																		BEGIN

																			SET @YarnDyedReq_Kgs = @REQKGS



																		END

																	END

																	ELSE

																		SET @YarnDyedReq_Kgs = @REQKGS

																END

																ELSE

																	SET @YarnDyedReq_Kgs = @REQKGS

															END





															IF @Dyeing_FabToYarnChkFlg = 1 and @FabtoYarn_6 ='NO' AND (@Deptname = 'YARN DYEING' OR																																				@DeptGrpCode1 =2 )

															BEGIN

																SET  @YarnDyedReq_Kgs = @YarnDyedReq_Kgs * (100 - @DYEING_LOSSPER) / 100

																 

															END

															ELSE

															BEGIN

																IF @pos3 < @YarnTwistPosition 

																BEGIN

																	IF  (SELECT  COUNT(1) FROM Mas_Count WHERE  type='S' and countid= @YCount_6_4) >0

																	BEGIN

																		If (Select count(1) From Prog_YTwist_Mas A INNER JOIN	Prog_YTwist_Dtl B ON A.ID =																					B.ID Where A.Ordid=@Ordid and Styleno=@StyleNo and CntID=@YCount_6_4) > 0 

																		BEGIN

																			SET @YarnDyedReq_Kgs = (@REQKGS * @ConsPer1_6 /100) / @NoofPiece

																			 

																		END

																		ELSE

																			SET @YarnDyedReq_Kgs = @REQKGS

																	END

																	ELSE

																		SET @YarnDyedReq_Kgs = @REQKGS

																END

																ELSE

																	SET @YarnDyedReq_Kgs = @REQKGS

															END



															IF (@Deptname ='YARN DYEING' OR @DeptGrpCode1 = 2) AND @ProcType_6 ='Purc.' AND @iYdLossFlg = 1

															BEGIN

																SET @YarnDyedReq_Kgs = @reqkgs * (100 - @YARNDYEING_LOSSPER) / 100

																 

															END 



															IF @Deptname = 'YARN DYEING' OR @Deptname = 'FABRIC TO YARN' OR @DeptGrpCode1 =2 

															BEGIN

																if @yarndy =1 

																BEGIN

																	if (@Deptname = 'YARN DYEING' OR @DeptGrpCode1 =2 ) AND @YarnDyedReq_Kgs_ForOtherDept > 0																			SET @REQKGS = @YarnDyedReq_Kgs_ForOtherDept



																	SELECT @ClrLossCnt1 = count(*) From Prog_Clrloss Where OrdId=@ORDID And Yd=IIf(@yarndy																										=1 , 1, 0) And ClrId=@Yclr_6_4

																	SELECT @ClrLossPercent = Isnull(Loss,0) FROM Prog_Clrloss Where OrdId=@ORDID 

																		And Yd=IIf(@yarndy =1 , 1, 0) And ClrId=@Yclr_6_4



																	SET @ClrID_Temp = @TmpClrID

																	if @ClrLossCnt1 >0 AND ( @Prs = 2 OR @Prs = 8 OR @Deptname = 'FABRIC TO YARN' OR																													@DeptGrpCode1 =2 )

																	BEGIN

																		if @ProcType_6 <> 'Purc.'

																		BEGIN

																			SET @TmpKgs = @YarnDyedReq_Kgs

																			SET @YarnDyedReq_Kgs = (@REQKGS / (100 - @ClrLossPercent)) * 100 

																			 

																			SET @YarnDyedReq_Kgs_ForOtherDept = @REQKGS

																			SET @TmpYarnKgs = @YarnDyedReq_Kgs

																			if @PcsFlg = 0 and @REQOTH >0

																			BEGIN

																				SET @othuom_1 = @REQOTH * (100 - @ClrLossPercent) * 100

																				SET @REQOTH = @REQOTH * (100 - @ClrLossPercent) * 100

																			END

																		END

																		if @Deptname ='FABRIC TO YARN' And @YarnDyedReq_Kgs > 0

																			SET @reqkgs_1 = @YarnDyedReq_Kgs



																	END



																END

															END 

															ELSE

															BEGIN

																if @yarndy = 1 

																BEGIN

																	SELECT @ClrLossCnt1 = count(*) From Prog_Clrloss Where OrdId=@ORDID And Yd=IIf(@yarndy																										=1 , 1, 0) And ClrId=@Yclr_6_4

																	SELECT @ClrLossPercent = Isnull(Loss,0) FROM Prog_Clrloss Where OrdId=@ORDID 

																		And Yd=IIf(@yarndy =1 , 1, 0) And ClrId=@Yclr_6_4

																	SELECT @ColorID = Isnull(CLRID,0) FROM Prog_Clrloss Where OrdId=@ORDID 

																		And Yd=IIf(@yarndy =1 , 1, 0) And ClrId=@Yclr_6_4



																	SET @ClrID_Temp = @TmpClrID



																	if @ClrLossCnt1 >0 AND ( @Prs = 2 OR @Prs = 8 OR @DeptGrpCode1 =2 OR @DeptGrpCode1 = 8 )

																	BEGIN

																		SET @YarnDyedReq_Kgs = (@reqkgs / (100 - @ClrLossPercent)) * 100

																		

																		SET @YarnDyedReq_Kgs_ForOtherDept = @YarnDyedReq_Kgs

																		if @PcsFlg =0 And @REQOTH >0

																		BEGIN

																		 SET @othuom_1 = (@REQOTH / (100 - @ClrLossPercent)) * 100

																		 SET @REQOTH = (@REQOTH / (100 - @ClrLossPercent)) * 100

																		 END 



																	END

																	ELSE

																	BEGIN

																		if @ClrLossCnt1 >0 

																		BEGIN

																			SET @TmpClrID = @ColorID

																			if @Yclr_6_4 = @TmpClrID 

																			BEGIN

																				If @YarnDyedReq_Kgs_ForOtherDept > 0 

																				BEGIN

																					SET @YarnDyedReq_Kgs = (@reqkgs / (100 - @ClrLossPercent)) * 100

																					 

																					END

																				ELSE

																				 SET @YarnDyedReq_Kgs = @reqkgs

																			END

																			ELSE

																				 SET @YarnDyedReq_Kgs = @reqkgs

																		END

																		ELSE

																			SET @YarnDyedReq_Kgs = @YarnDyedReq_Kgs

																	END 



																END 

															END





															If (Select sl	from  OrdSeq where ordid = @ORDID and prs = 2 and sl > @sl) > 0 

															And @ProcType_6 = 'Purc.'

															BEGIN

															  SET @Reqval = 0

															  SET @reqkgs_1 = 0 

															END

															ELSE

																BEGIN

																	SET @ReqVal = 1

																	IF @pos2 > @YarnTwistPosition and (@Deptname ='YARN DYEING' or @DeptGrpCode1 =2)

																	BEGIN

																		SET @reqkgs_1 = (@YarnDyedReq_Kgs * @ConsPer1_6 / 100) / @NoofPiece

																		 

																	END

																	ELSE

																	BEGIN

																		SET @reqkgs_1 = (@YarnDyedReq_Kgs * @ConsPer1_6_4 / 100) / @NoofPiece

																		 

																	END

																END



																SET @othuom_1 =0 

																SET @type_1 = 'Y'

																SET @sl_1 = @sl_1 



																IF @Deptname ='FABRIC TO YARN' AND @FabtoYarn_6 ='Yes'

																	Insert into Prog_ReqCalTWrk			

																	(IpAddress, Prs, Component, clrcombo, clr, fabtype, ycount, gsm,gg,ll,dia,reqkgs, othuom,

																	ordid,styleno,type,sl,Component_Block,SubPrsID) 

																	Values(@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@gsm_1,@gg,

																	@ll,@dia_1,@reqkgs_1,@othuom_1,@ordid,@styleno,@type_1,@sl_1,@Component_Block,@SubPrsID)

																ELSE 

																BEGIN

																	IF (@Deptname =  'YARN DYEING' OR @DeptGrpCode1 =2) AND @FabtoYarn_6 ='NO'

																		Insert into Prog_ReqCalTWrk			

																		(IpAddress, Prs, Component, clrcombo, clr, fabtype, ycount, gsm,gg,ll,dia,reqkgs, othuom,

																		ordid,styleno,type,sl,Component_Block,SubPrsID) 

																		Values(@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@gsm_1,@gg,

																		@ll,@dia_1,@reqkgs_1,@othuom_1,@ordid,@styleno,@type_1,@sl_1,@Component_Block,@SubPrsID)

																	ELSE

																		BEGIN 

																		if @Deptname='YARN' And @ReqVal >0

																		Insert into Prog_ReqCalTWrk			

																		(IpAddress, Prs, Component, clrcombo, clr, fabtype, ycount, gsm,gg,ll,dia,reqkgs, othuom,

																		ordid,styleno,type,sl,Component_Block,SubPrsID) 

																		Values(@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@gsm_1,@gg,

																		@ll,@dia_1,@reqkgs_1,@othuom_1,@ordid,@styleno,@type_1,@sl_1,@Component_Block,@SubPrsID)

																	ELSE

																		BEGIN

																			if (@Deptname ='YARN DYEING' OR @DeptGrpCode1 = 2 ) AND @FabtoYarn_6 ='Yes' and @ReqVal >0

																			Insert into Prog_ReqCalTWrk			

																		(IpAddress, Prs, Component, clrcombo, clr, fabtype, ycount, gsm,gg,ll,dia,reqkgs, othuom,

																		ordid,styleno,type,sl,Component_Block,SubPrsID) 

																		Values(@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@gsm_1,@gg,

																		@ll,@dia_1,@reqkgs_1,@othuom_1,@ordid,@styleno,@type_1,@sl_1,@Component_Block,@SubPrsID)

																		ELSE

																		BEGIN

																			if @ReqVal >0 

																			BEGIN

																				Insert into Prog_ReqCalTWrk			

																		(IpAddress, Prs, Component, clrcombo, clr, fabtype, ycount, gsm,gg,ll,dia,reqkgs, othuom,

																		ordid,styleno,type,sl,Component_Block,SubPrsID) 

																		Values(@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@gsm_1,@gg,

																		@ll,@dia_1,@reqkgs_1,@othuom_1,@ordid,@styleno,@type_1,@sl_1,@Component_Block,@SubPrsID)

																			END

																		END





																		END

																		END



																		

																END

																SET @sl_1 = @sl_1 +1



												FETCH NEXT FROM CURSOR_6_4 INTO @YCount_6_4, @Yclr_6_4, @ConsPer1_6_4

											END

											CLOSE CURSOR_6_4  

											DEALLOCATE CURSOR_6_4



											END

											ELSE

											BEGIN

												SET @ReqVal = 0

												IF NOT (@Deptname ='FABRIC TO YARN' OR @Deptname ='YARN DYEING' OR @DeptGrpCode1 = 2)

												BEGIN

													if @yarndy = 1 

													BEGIN

														if @flg2 = 1 

															SET @clr_1 = @Yclr_6

														ELSE

														BEGIN

															if @ColType_6 = 'G' AND @Deptname = 'YARN'

																SET @clr_1 = 0

															ELSE

																SET @clr_1 = 0

														END

													END 

													ELSE

														SET @clr_1 = 0

												END

												ELSE

												BEGIN

													if @Deptname ='YARN DYEING' AND @DeptGrpCode1 = 2

														SET @clr_1 = @Yclr_6

													ELSE

														SET @clr_1 = @Yclr_6

												END



												SET @fabtype_1 = 0 

												SET @ycount_1 = @YCount_6

												SET @gsm_1  =0 ; SET @ll_1 ='' ; SET @gg_1 =0 ; SET @dia_1 = 0 



												IF @FabToYarnChkFlg = 1 AND @FabtoYarn_6 ='NO' AND (@Deptname ='YARN DYEING' OR @DeptGrpCode1 =2 )

												BEGIN

													 SET @YarnDyedReq_Kgs = @REQKGS * (100 - @FABTOYARN_LOSSPER) / 100

													  

												END

												ELSE

													BEGIN

														if @pos3 < @YarnTwistPosition

														BEGIN

															if (select 1 from MAs_count where type='S' and countid= @YCount_6) >0

																SET @YarnDyedReq_Kgs = @REQKGS

															ELSE

																SET @YarnDyedReq_Kgs = @REQKGS

														END

														ELSE

															SET @YarnDyedReq_Kgs = @REQKGS

													END



												IF @Dyeing_FabToYarnChkFlg = 1 AND @FabtoYarn_6 ='NO' AND (@Deptname = 'YARN DYEING' OR @DeptGrpCode1 =2)

												BEGIN

													SET @YarnDyedReq_Kgs = @YarnDyedReq_Kgs * (100 - @DYEING_LOSSPER) / 100

													 

												END

												ELSE

												BEGIN

													if @pos3 < @YarnTwistPosition

													BEGIN

														if (select 1 from MAs_count where type='S' and countid=@YCount_6) >0

															 SET @YarnDyedReq_Kgs = @reqkgs

														ELSE

															 SET @YarnDyedReq_Kgs = @reqkgs

													END

													ELSE

														SET @YarnDyedReq_Kgs = @reqkgs

												END



												if (@Deptname = 'YARN DYEING' OR @DeptGrpCode1 = 2 ) AND @ProcType_6 ='Purc.' And @iYdLossFlg =1 

												BEGIN

													 SET @YarnDyedReq_Kgs = @reqkgs * (100 - @YARNDYEING_LOSSPER) / 100

													   

												END



												if @Deptname = 'YARN DYEING' OR @Deptname = 'FABRIC TO YARN' OR @DeptGrpCode1 =2 

												BEGIN

													if @yarndy =  1

													BEGIN

														if (@Deptname ='YARN DYEING' OR @DeptGrpCode1 = 2) ANd @YarnDyedReq_Kgs_ForOtherDept > 0 

															SET @REQKGS = @YarnDyedReq_Kgs_ForOtherDept



														SELECT @ClrLossCnt1 = count(*) From Prog_Clrloss Where OrdId=@ORDID And Yd=IIf(@yarndy																										=1 , 1, 0) And ClrId=@Yclr_6_4

														SELECT @ClrLossPercent = Isnull(Loss,0) FROM Prog_Clrloss Where OrdId=@ORDID 

																		And Yd=IIf(@yarndy =1 , 1, 0) And ClrId=@Yclr_6_4

																	



														SET @ClrID_Temp = @TmpClrID



														if @ClrLossCnt1 >0 And (@Prs = 2 or @Prs = 8 OR @Deptname = 'FABRIC TO YARN' OR @DeptGrpCode1 =2 )

														BEGIN

															if @ProcType_6 <>'Purc.'

															BEGIN

																SET @TmpKgs = @YarnDyedReq_Kgs

																SET @YarnDyedReq_Kgs = (@reqkgs / (100 - @ClrLossPercent)) * 100 

																  

																SET @YarnDyedReq_Kgs_ForOtherDept = @reqkgs

																SET @TmpYarnKgs = @YarnDyedReq_Kgs

																if @PcsFlg = 0 And @REQOTH >0

																	SET @reqoth = (@reqoth / (100 - @ClrLossPercent)) * 100

															END

															if @Deptname ='FABRIC TO YARN' AND @YarnDyedReq_Kgs > 0

																SET @REQKGS = @YarnDyedReq_Kgs

														END



													END

												END

												ELSE

												BEGIN

													if @yarndy = 1

													BEGIN

															SELECT @ClrLossCnt1 = count(*) From Prog_Clrloss Where OrdId=@ORDID And Yd=IIf(@yarndy																										=1 , 1, 0) And ClrId=@Yclr_6_4

															SELECT @ClrLossPercent = Isnull(Loss,0) FROM Prog_Clrloss Where OrdId=@ORDID 

																		And Yd=IIf(@yarndy =1 , 1, 0) And ClrId=@Yclr_6_4

																	

															SELECT @ColorID = Isnull(CLRID,0) FROM Prog_Clrloss Where OrdId=@ORDID 																		And Yd=IIf(@yarndy =1 , 1, 0) And ClrId=@Yclr_6_4



															SET @ClrID_Temp = @TmpClrID

															if @ClrLossCnt1 >0 AND(@Prs = 2 OR @Prs = 8 OR @DeptGrpCode1 = 2)

															BEGIN

																SET @YarnDyedReq_Kgs = (@reqkgs / (100 - @ClrLossPercent)) * 100

																  

																SET @YarnDyedReq_Kgs_ForOtherDept = @YarnDyedReq_Kgs

																if @PcsFlg =0 and @REQOTH >0

																	SET @reqoth = (@reqoth / (100 - @ClrLossPercent)) * 100

															END

															ELSE

															BEGIN

																if @ClrLossCnt1 >0

																BEGIN

																	SET @TmpClrID = @ColorID 

																	if @Yclr_6 = @TmpClrID

																	BEGIN

																		if @YarnDyedReq_Kgs_ForOtherDept >0 

																		BEGIN

																			 SET @YarnDyedReq_Kgs = (@reqkgs / (100 - @ClrLossPercent)) * 100

																			  

																		END

																		ELSE

																			 SET @YarnDyedReq_Kgs = @reqkgs

																	END

																	ELSE

																		 SET @YarnDyedReq_Kgs = @reqkgs



																END

																ELSE

																BEGIN

																	 SET @YarnDyedReq_Kgs = @YarnDyedReq_Kgs

																END



															END

													END



												END



												 If (Select sl	from  OrdSeq where ordid = @Ordid and prs = 2 and sl > @sl) > 0 And @ProcType_6 = 'Purc.' 

												 BEGIN

													if @Deptname = 'YARN' AND @ColType_6 ='G'

													BEGIN

														  SET @Reqval = 1

														  SET @TmpYarnDyedForColType_Color_ReqKgs = @YarnDyedReq_Kgs * (100 - @YARNDYEING_LOSSPER) / 100

														   

														  SET @reqkgs_1 =  (@TmpYarnDyedForColType_Color_ReqKgs * @ConsPer1_6 / 100) / @NoofPiece

														   



													END

													ELSE

													BEGIN

														SET @ReqVal = 0 

														SET @reqkgs_1 = 0 

													END

												 END 

												 ELSE

												 BEGIN

													 SET @Reqval = 1

													 if @Deptname = 'YARN' AND @ColType_6 ='G'

													 BEGIN

														 SET @TmpYarnDyedForColType_Color_ReqKgs = @YarnDyedReq_Kgs * (100 - @YARNDYEING_LOSSPER) / 100

														 SET @reqkgs_1 =  (@TmpYarnDyedForColType_Color_ReqKgs * @ConsPer1_6 / 100) / @NoofPiece

														  

													 END

													 ELSE

													 BEGIN

														SET @reqkgs_1 = (@YarnDyedReq_Kgs * @ConsPer1_6 / 100) / @NoofPiece

														 

													 END 

												 END



												 SET @othuom_1 = 0 

												 SET @type_1 = 'Y'

												 SET @sl_1 = @sl_1 



												 IF @Deptname = 'FABRIC TO YARN' AND @FabtoYarn_6 ='Yes'

													Insert into Prog_ReqCalTWrk(IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,
dia,reqkgs,

													othuom,ordid,styleno,type,sl,Component_Block,SubPrsId) Values							

													(@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@gsm_1,@gg_1,@ll_1,@dia_1,@reqkgs_1,

													@othuom_1,@ordid,@styleno,@type_1,@sl_1,@Component_Block,@SubPrsId)



												 ELSE 

													BEGIN

														if (@Deptname ='YARN DYEING' OR @DeptGrpCode1 =2 ) AND @FabtoYarn_6 = 'No'

														BEGIN

															if @ColType_6 ='C'

																Insert into Prog_ReqCalTWrk(IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,
dia,reqkgs,

													othuom,ordid,styleno,type,sl,Component_Block,SubPrsId) Values							

													(@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@gsm_1,@gg_1,@ll_1,@dia_1,@reqkgs_1,

													@othuom_1,@ordid,@styleno,@type_1,@sl_1,@Component_Block,@SubPrsId)

														END 

														ELSE 

														BEGIN

															if @Deptname = 'YARN' and @ReqVal >0

															BEGIN

															Insert into Prog_ReqCalTWrk(IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,
dia,reqkgs,

													othuom,ordid,styleno,type,sl,Component_Block,SubPrsId) Values							

													(@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@gsm_1,@gg_1,@ll_1,@dia_1,@reqkgs_1,

													@othuom_1,@ordid,@styleno,@type_1,@sl_1,@Component_Block,@SubPrsId)

															END 

															ELSE

															BEGIN

																if (@Deptname = 'YARN DYEING' OR @DeptGrpCode1 = 2) AND @FabtoYarn_6 = 'Yes'

																BEGIN

																	if @ReqVal > 0 

																	BEGIN

																		if @ColType_6 ='C' 

																		BEGIN

																			if NOT (@fabtoyarn = 1 AND @yarndy = 1 AND @ProcType_6 ='Proc.')

																			BEGIN

																				Insert into Prog_ReqCalTWrk(IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,
dia,reqkgs,

													othuom,ordid,styleno,type,sl,Component_Block,SubPrsId) Values							

													(@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@gsm_1,@gg_1,@ll_1,@dia_1,@reqkgs_1,

													@othuom_1,@ordid,@styleno,@type_1,@sl_1,@Component_Block,@SubPrsId)

																			END

																		END

																	END

																END

																	ELSE

																	BEGIN

																		IF NOT (@Deptname = 'FABRIC TO YARN' AND @FabtoYarn_6 ='No')

																		BEGIN

																			if  @ReqVal >0 

																			BEGIN

																				if @FabtoYarn_6 ='' and (@Deptname ='YARN DYEING' OR @DeptGrpCode1 = 2)

																				BEGIN

																					if @ColType_6 ='C'

																					BEGIN

																					Insert into Prog_ReqCalTWrk(IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,
dia,reqkgs,

												othuom,ordid,styleno,type,sl,Component_Block,SubPrsId) Values							

												(@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@gsm_1,@gg_1,@ll_1,@dia_1,@reqkgs_1,

												@othuom_1,@ordid,@styleno,@type_1,@sl_1,@Component_Block,@SubPrsId)

																					END 

																				END 

																				ELSE

																				BEGIN

																					if @Deptname ='YARN TWISTING'

																					BEGIN

																						if (select 1 from MAs_count where type='T' and countid= @YCount_6) > 0

																						BEGIN

																							Insert into Prog_ReqCalTWrk(IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,
dia,reqkgs,

												othuom,ordid,styleno,type,sl,Component_Block,SubPrsId) Values							

												(@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@gsm_1,@gg_1,@ll_1,@dia_1,@reqkgs_1,

												@othuom_1,@ordid,@styleno,@type_1,@sl_1,@Component_Block,@SubPrsId)

																						END

																					END

																					ELSE

																						BEGIN

																						Insert into Prog_ReqCalTWrk(IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,
dia,reqkgs,

												othuom,ordid,styleno,type,sl,Component_Block,SubPrsId) Values							

												(@IpAddress_1,@Prs,@compID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@gsm_1,@gg_1,@ll_1,@dia_1,@reqkgs_1,

												@othuom_1,@ordid,@styleno,@type_1,@sl_1,@Component_Block,@SubPrsId)

																						END

																				--	END

																				END

																			END

																		END

																	

																		END



																		--END



																	--END

																--END

															END

														END 



													END 

											END

											SET @sl_1 = @sl_1 + 1



											FETCH NEXT FROM CURSOR_6_3 INTO @YCount_6, @Yclr_6, @ConsPer1_6,@FabtoYarn_6,@ProcType_6,@ColType_6

											END

											CLOSE CURSOR_6_3  

											DEALLOCATE CURSOR_6_3 



											if @Deptname = 'FABRIC TO YARN'  

											BEGIN

													SELECT @Prs_1 = DeptID FROM Mas_Dept WHERE (DeptID = 4 or isNull(DeptGrpCode,0) = 4 )

													SET @clr_1 = @CLR 

													SET @fabtype_1 = @FabDesc 

													SET @ycount_1 = @CntID 

													if @KnitWoven ='K'

													BEGIN

														SET @dia_1 = @kdia 

														SET @fdia_1 = @fdia

													END 

													ELSE

													BEGIN

														SET @dia_1 = @FabWid

														SET @fdia_1 = @FabWid

													END 

													SET @reqkgs_1 =( @REQKGS  * (100 - @FABTOYARN_LOSSPER) / 100) / @NoofPiece

													 

													SET @othuom_1 = @REQOTH / @NoofPiece 

													SET @type_1 ='F'

													SET @sl_1 = @sl_1 

													SET @SPRSID = 0

													SET @SPRSID = @SubPrsId

													IF @SubPrsId = 0 

													BEGIN

														SELECT @SubPrsId_1 = IsNull(Prog_PrsLoss.SubPrsId,0)  FROM OrdSeq INNER JOIN Prog_Prsloss ON OrdSeq.Prs = Prog_Prsloss.Prs INNER JOIN Mas_Dept ON Prog_Prsloss.Prs = Mas_Dept.DeptID WHERE OrdSeq.OrdID =@ORdid  AND Prog_Prsloss.ID = @ID and InputType<>'P' AND (Mas_Dept.DeptID = 4 OR Mas_Dept.DeptGrpCode = 4)

													END 

												



												Insert into Prog_ReqCalTWrk(IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,
dia,reqkgs,othuom,ordid,styleno,type,sl,FinDiaId,FinGSM,Component_Block,SubPrsID) Values(@IpAddress_1,@Prs_1,@CompID,@ClrCombID,@clr_1,@fabtype_1,@ycount_1,@gsm_1,@gg_1,@ll_1,@dia_1,@reqkgs_1,@othuom_1,@ordid,@styleno,@type_1,@sl_1,@fdia_1,@fgsm_1,@Component_Block,@SubPrsID_1)

												SET @Sl_1 = @Sl_1 + 1

											END



										END

										ELSE

										BEGIN

											if @Deptname = 'CUTTING' AND @OutputType ='P'

											BEGIN

												if SUBSTRING(@ColEntryMust,1,1)='Y'

												BEGIN

													if @OverDyeing ='1'

													BEGIN

														SET @clr_1 = @CLR1

													END 

													ELSe

														SET @clr_1 = @CLR	

												END 

												ELSE

												BEGIN

													if @Yd = '1'

													BEGIN

														IF @OverDyeing ='1'

															SET @clr_1 = @CLR1

														ELSE

															SET @clr_1 = @CLR

													END

													ELSE

														SET @clr_1 = 0



												END

												IF @fabtoyarn = 1 

												BEGIN

													IF @flg1 = 1 

														SET @fabtype_1 = @FabDesc 

													ELSE

														SET @fabtype_1 = @LooseFab 

												END  

												ELSE

													SET @fabtype_1 = @FabDesc 



												SET @ycount_1 = @CntID 

												SET @gsm_1 = @GreyGsm

												SET @gg_1 = @GG 

												SET @ll_1 = @LL

												if @KnitWoven ='K'

												BEGIN

													if @fabtoyarn = 1 

													BEGIN

														if @flg1 = 1 

														BEGIN

															SET @dia_1 = @kdia

															SET @fdia_1 = @fdia 

														END 

														ELSE

														BEGIN

															SET @dia_1 = @ldia

															SET @fdia_1 = @ldia

														END 

													END 

													ELSE

													BEGIN

														SET @dia_1 = @kdia

														SET @fdia_1 = @fdia 

													END 

												END

												ELSE

												BEGIN

													SET @dia_1 = @FabWid

													SET @fdia_1 = @FabWid

												END



												SET @reqkgs_1 = @REQKGS / @NoofPiece

												 

												SET @othuom_1 = @REQOTH / @NoofPiece

												SET @type_1 ='F'

												SET @sl_1 = @sl_1

												SET @fgsm_1 = @FinalGsm



												Insert into Prog_ReqCalTWrk(IpAddress,Prs,Component,clrcombo,clr,fabtype,ycount,gsm,gg,ll,
dia,reqkgs,othuom,ordid,styleno,type,sl,FinDiaId,FinGSM,Component_Block,DesignId,
SubPrsID) Values(@IpAddress_1,@Prs,@CompID,@ClrCombID,@clr_1,@fabtype_1,
@ycount_1,@gsm_1,@gg_1,@ll_1,@dia_1,@reqkgs_1,@othuom_1,@ordid,@styleno,@type_1,@sl_1,@fdia_1,@fgsm_1,@Component_Block,@DesignID,@SubPrsID)

												SET @Sl_1 = @Sl_1 + 1

											END

										END 

									END

								END

							END 

					END 



				END

				FETCH NEXT FROM CURSOR_4_MAIN INTO @Prs, @Loss_Per, @Deptname, @InputType, @OutputType, @ColEntryMust,@sl,@DeptId,@SubPrsId

				END  	

				CLOSE CURSOR_4_MAIN

				DEALLOCATE CURSOR_4_MAIN 







   FETCH NEXT FROM Cursor_1 INTO @Yd , @compID , @ID , @ClrCombID , @FabClr ,@FabDesc , @GreyGsm , @FinalGsm , @GG , @LL ,

@FabWid , @WtUom , @LooseFab , @sizid , @pcswgt , @kdia ,@fdia , @ldia , @OrderQty , @Exs_Per ,@compgrdslno , @PExc  ,@NoofPiece ,@CutPlanQty ,@Component_Block ,@PartId ,@DesignID ,@OverDyeing 



   END



    

CLOSE Cursor_1  

DEALLOCATE Cursor_1 



	if @JobOrder = 'Y'

	BEGIN

		Delete from Pro_ReqJob_temp WHERE OrdId =@OrdId AND StyleNo =@StyleNo And JobOrdID = @JobID

	END 

	ELSE

	BEGIN

		DELETE from Pro_ReqYarn WHERE OrdId = @OrdId AND StyleNo =@StyleNo

		Delete from Pro_ReqKnitt WHERE OrdId =@OrdId AND StyleNo =@StyleNo

		Delete from Pro_ReqYarn_ComboWise WHERE OrdId = @OrdId AND StyleNo =@StyleNo

		Delete from Pro_ReqKnitt_ComboWise WHERE OrdId =@OrdId AND StyleNo =@StyleNo

			

		IF (SELECT COUNT(1) FROM Prog_ReqCalTWrk WHERE ipaddress = @IPAddress AND type = 'Y' AND ordid =@OrdId AND styleno =@StyleNo and ISNull(Component_Block,'N') ='N' ) >0 

BEGIN	

		Insert into Pro_ReqYarn(OrdID,DeptID,CountID,ColID,ReqKGs,StyleNo) SELECT Ordid,prs, ycount, clr, SUM(reqkgs) AS reqkgs, styleno FROM Prog_ReqCalTWrk WHERE ipaddress = @IPAddress AND type = 'Y' AND ordid =@OrdId AND styleno =@StyleNo and ISNull(Component_Block,'N') ='N' GROUP BY Ordid,prs, ycount, clr, styleno





		Insert into Pro_ReqYarn_ComboWise(OrdID,DeptID,CountID,ColID,ReqKGs,StyleNo,ComboID) 

		SELECT Ordid,prs, ycount,  Clr,SUM(reqkgs) AS reqkgs, styleno,ClrCombo FROM Prog_ReqCalTWrk WHERE ipaddress = @IPAddress AND type = 'Y' AND ordid =@OrdId AND styleno =@StyleNo and ISNull(Component_Block,'N') ='N' GROUP BY Ordid,prs, ycount, ClrCombo,clr
, styleno



END









		Insert into Pro_Reqknitt(OrdID,DeptID,Fabid,CntID,colID,Gsm,GG,ll,diaid,reqkgs,reqmtr,styleno,DesignId,FinDiaId,FinGSM,Repeatedlen,Prg_Comments,SubPrsID)

		SELECT Ordid, Prs,fabtype, ycount,clr, gsm, gg, ll, IsNull(dia,0) as Dia, SUM(reqkgs) AS reqkgs, SUM(othuom) AS othuom,Styleno,ISNULL(DesignId,0) as DesignId,IsNull(FinDiaId,0) as FinDiaId,IsNull(FinGsm,0) as FinGsm,IsNull(Repeatedlen,'') as Repeatedlen,IsNull(Prg_Comments,'') as Prg_Comments,isNull(SubPrsID,0) as SubPrsID FROM Prog_ReqCalTWrk WHERE ipaddress = @IPAddress AND ordid =@OrdId AND styleno =@StyleNo AND type = 'F' and ISNull(Component_Block,'N') ='N' and isnull(Prs,0) >0 AND (FinDiaId > 0 AND dia >0 ) GROUP BY PRs,clr, fabtype, ycount, gsm, gg, ll, IsNull(dia,0) ,ISNULL(DesignId,0),IsNull(FinDiaId,0),FinGsm,IsNull(Repeatedlen,''),IsNull(Prg_Comments,''),isNull(SubPrsID,0),Ordid ,Styleno 



		Insert into Pro_Reqknitt_ComboWise(OrdID,DeptID,Fabid,CntID,colID,Gsm,GG,ll,diaid,reqkgs,reqmtr,styleno,DesignId,FinDiaId,FinGSM,ComboID,SubPrsID) 

		SELECT Ordid,Prs,fabtype,ycount,clr, gsm, gg, ll, dia, SUM(reqkgs) AS reqkgs, SUM(othuom) AS othuom,Styleno,ISNULL(DesignId,0) as DesignId,FinDiaId,FinGsm,ClrCombo,isNull(SubPrsID,0) as SubPrsID FROM Prog_ReqCalTWrk WHERE ipaddress = '" & Trim(My.Computer.Name) & "' AND ordid =@OrdId AND styleno =@StyleNo AND type = 'F' and ISNull(Component_Block,'N') ='N' GROUP BY Ordid , PRs,ClrCombo,clr, fabtype, ycount, gsm, gg, ll, dia,DesignId,FinDiaId,FinGsm,isNull(SubPrsID,0) ,styleno



	



	END 



	if @JobOrder ='Y'

	BEGIN

		IF @JobOrderStageWise ='Y'

		BEGIN

		Insert into Pro_ReqJob_temp (OrdID,DeptID,Fabid,CntID,colID,Gsm,GG,ll,diaid,reqkgs,reqmtr,styleno,DesignId,FinDiaId,FinGSM,JobOrdID)

		 SELECT Prog_ReqCalTWrk.Ordid,Prs,fabtype, ycount,clr,  gsm, gg, ll, dia, SUM(reqkgs) AS reqkgs, SUM(othuom) AS othuom,Prog_ReqCalTWrk.StyleNo,ISNULL(DesignId,0) as DesignId,FinDiaId,FinGsm,@JobID FROM Prog_ReqCalTWrk INNER JOIN Mas_Dept ON Prog_ReqCalTWrk.PRS = Mas_Dept.DeptID Inner Join Prod_CutComponents On Prog_ReqCalTWrk.ordid=Prod_CutComponents.OrdId And Prog_ReqCalTWrk.StyleNo=Prod_CutComponents.StyleNo And Prog_ReqCalTWrk.component=Prod_CutComponents.CompId And WtFlg='Y' WHERE ipaddress = @IPAddress AND Prog_ReqCalTWrk.ordid =@OrdId AND Prog_ReqCalTWrk.styleno =@StyleNo AND type = 'F' And (Mas_Dept.DeptName='CUTTING') and ISNull(Component_Block,'N') ='N' and Prod_CutComponents.JobID =@JobID GROUP BY Prog_ReqCalTWrk.Ordid,Prog_ReqCalTWrk.Styleno,
PRs,clr, fabtype, ycount, gsm, gg, ll, dia,DesignId,FinDiaId,FinGsm



		END 

		ELSE

		BEGIN

		Insert into Pro_ReqJob_temp(OrdID,DeptID,Fabid,CntID,colID,Gsm,GG,ll,diaid,reqkgs,reqmtr,styleno,DesignId,FinDiaId,FinGSM,JobOrdID)

		SELECT Ordid,Prs,fabtype, ycount, clr, gsm, gg, ll, dia, SUM(reqkgs) AS reqkgs, SUM(othuom) AS othuom,Styleno,ISNULL(DesignId,0) as DesignId,FinDiaId,FinGsm,@JobID FROM Prog_ReqCalTWrk INNER JOIN Mas_Dept ON Prog_ReqCalTWrk.PRS = Mas_Dept.DeptID WHERE ipaddress = @IPAddress AND ordid =@OrdId AND styleno =@StyleNo AND type = 'F' And (Mas_Dept.DeptName='CUTTING') and ISNull(Component_Block,'N') ='N' GROUP BY Ordid,Styleno,PRs,clr, fabtype, ycount, gsm, gg, ll, dia,DesignId,FinDiaId,FinGsm

		END

	END



	  If (Select isnull(Count(*),0) From OrdStyle Where Ordid=@Ordid AND Styleno=@Styleno AND CopyGSM=1) > 0 

	  BEGIN

	    Update Pro_ReqKnitt Set FinGsm=Gsm, FinDiaID=DiaID Where Ordid=@Ordid AND Styleno=@Styleno

        Update Pro_ReqJob_temp Set FinGsm=Gsm, FinDiaID=DiaID Where Ordid=@Ordid AND Styleno=@Styleno

        Update Pro_ReqKnitt_ComboWise Set FinGsm=Gsm, FinDiaID=DiaID Where Ordid=@Ordid AND Styleno=@Styleno

	  END

	     

      

		If (Select IsNull(FabTOYarn_Count_Hide_In_Requirement,'N') from Options)= 'Y'

		BEGIN

				DECLARE Cursor_10 CURSOR FOR 	

				SELECT  DISTINCT yCount,YClr FROM Prog_ClrComb A INNER JOIN Prog_Ycns B ON A.ID = B.ID Where ORdid=@Ordid And StyleNo = @Styleno and FabToYarn='Yes' and ProcType='Proc.'  		

				OPEN Cursor_10

				FETCH NEXT FROM Cursor_10 INTO @Ycount_10,@YClr_10	

				WHILE @@FETCH_STATUS = 0 		

				BEGIN   



					Update Pro_ReqYarn Set FabToYarn_Flag='Y' Where Ordid =@Ordid AND StyleNo =@StyleNo and DeptId = 2 

					And CountId =@Ycount_10 AND ColId = @YClr_10



					FETCH NEXT FROM Cursor_10 INTO @Ycount_10,@YClr_10	

				END

				CLOSE Cursor_10 

				DEALLOCATE Cursor_10

				Update Pro_ReqYarn Set FabToYarn_Flag='N' Where FabToYarn_Flag Is Null

		END

		ELSE

			Update Pro_ReqYarn Set FabToYarn_Flag='N' WHERE OrdId = @Ordid And StyleNo = @StyleNo 





			/* Shortage Updation */



		

				DECLARE Cursor_Shortage CURSOR FOR 	

				SELECT  Dept,CntID,ColID,isnull(ShortKgs,0) as ShortKgs from Trs_Shortage INNER JOIN Mas_Dept ON Trs_Shortage.Dept =							Mas_Dept.DeptID Where OrdId=@Ordid and OutputType='Y' And StyleNo=@StyleNo 



				OPEN Cursor_Shortage

				FETCH NEXT FROM Cursor_Shortage INTO @Dept,@Count_ID,@Color_ID1,@shortKgs

				WHILE @@FETCH_STATUS = 0 		

				BEGIN   

					IF (SELECT Count(1) FROM Pro_ReqYarn Where OrdID=@Ordid  and DeptID =@Dept and CountID=@Count_ID 

					AND ColID=@Color_ID1 And StyleNo=@StyleNo) = 0 

					BEGIN

						Insert into Pro_ReqYarn (OrdID,DeptID,CountId,ColID,ReqKgs,ShortKgs,StyleNo) Values				

						(@Ordid,@Dept,@Count_ID,@Color_ID1,0,@ShortKgs,@StyleNo)

					END

					ELSE

					BEGIN

						UPDATE Pro_ReqYarn Set ShortKgs= @ShortKgs Where OrdID=@OrdID and DeptID=@Dept and CountID=@Count_ID 

						and ColID = @Color_ID1 And StyleNo=@StyleNo

					END 



					FETCH NEXT FROM Cursor_Shortage INTO @Dept,@Count_ID,@Color_ID1,@shortKgs

				END

				CLOSE Cursor_Shortage 

				DEALLOCATE Cursor_Shortage





				DECLARE CURSOR_SHORTAGE_FAB CURSOR FOR 	

				SELECT  DEPT,FabID,ColID,CntID,GSM,GG,LL,DiaID,FinGSM,FinDiaID,SubPRSID,DESIGNID,isnull(ShortKgs,0) as ShortKgs,IsNull(ShortMtr,0) as ShortMtr from Trs_Shortage INNER JOIN Mas_Dept ON Trs_Shortage.Dept =Mas_Dept.DeptID Where OrdId=@Ordid and OutputType='F' And StyleNo=@StyleNo 



				OPEN CURSOR_SHORTAGE_FAB

				FETCH NEXT FROM CURSOR_SHORTAGE_FAB INTO	@Dept_2,			 

				@FabID ,@COLOR_ID_2,@COUNT_ID_2 ,@GSM_2 ,@GG_2 ,@LL_2 ,@DiaID_2,@FinGSM_2 ,@FinDiaID_2 ,@SubPRSID_2,@DEsign_ID_2, @ShortKGS_Fab ,@ShortMtr_Fab 

				WHILE @@FETCH_STATUS = 0 		

				BEGIN   

					IF (SELECT Count(1) FROM Pro_ReqKnitt Where OrdID=@Ordid and DeptID =@Dept_2 and FabID=@FabID and ColID=@COLOR_ID_2 And CntID =@COUNT_ID_2 And GSM=@GSM_2 And GG=@GG_2 And LL=@LL_2 And DiaID=@DiaID_2 And FinGSM=@FinGSM_2 And FinDiaID=@FinDiaID_2 And StyleNo=@StyleNo and SubPrsID=@SubPRSID_2) = 0 

					BEGIN

						Insert into Pro_ReqKnitt (OrdID,DeptID,FabId,ColID,CntID,GSM,GG,LL,DiaID,ReqKgs,ReqMtr,ShortKgs,ShortMtr,StyleNo,FinGsm,FinDiaID,DesignID,SubPrsID) Values (@OrdID,@Dept_2,@FabID,@COLOR_ID_2,@COUNT_ID_2,@GSM_2,@GG_2,@LL_2,@DiaID_2,0,0,@ShortKGS_Fab,@ShortMtr_Fab,@StyleNo,@FinGSM_2, @FinDiaID_2,@DESIGN_ID_2,@SubPRSID_2)

					END

					ELSE

					BEGIN

						Update Pro_ReqKnitt Set ShortKgs=@ShortKGS_Fab,ShortMtr=@ShortMtr_Fab Where OrdID=@OrdID and DeptID=@Dept_2 and FabID=@FabID and ColID = @COLOR_ID_2 and CntID = @COUNT_ID_2 And GSM = @GSM_2 and GG = @GG_2 and LL = @LL_2 and DiaID = @DiaID_2 And StyleNo=@StyleNo And FinDiaID = @FinDiaID_2 AND FinGsm = @FinGSM_2 And DesignID = @DESIGN_ID_2 And SubPrsid=@SubPRSID_2

					END 



					FETCH NEXT FROM CURSOR_SHORTAGE_FAB INTO	@Dept_2,			 

				@FabID ,@COLOR_ID_2,@COUNT_ID_2 ,@GSM_2 ,@GG_2 ,@LL_2 ,@DiaID_2,@FinGSM_2 ,@FinDiaID_2 ,@SubPRSID_2 ,@DEsign_ID_2,@ShortKGS_Fab ,@ShortMtr_Fab 



				END

				CLOSE CURSOR_SHORTAGE_FAB 

				DEALLOCATE CURSOR_SHORTAGE_FAB





				IF (Select Count(*) From MR_Fabric Where OrdId=@ORDID) =0

				BEGIN



					DECLARE CURSOR_MR_FABRIC CURSOR FOR 	

					SELECT OrdSeq.Sl,X.DeptId,Case When DeptName='CUTTING' Then 'CUT(LOT)' Else DeptName End As DeptName,X.ReqKgs From (Select OrdId,DeptId,Sum(ReqKgs) As ReqKgs From Pro_ReqYarn Where OrdId=@ORDID Group By OrdId,DeptId Union Select OrdId,DeptId,Sum(ReqKgs) As ReqKgs From Pro_ReqKnitt Where OrdId=@ORDID Group By OrdId,DeptId) X Inner Join Mas_Dept On X.DeptId=Mas_Dept.DeptID Inner Join OrdSeq On X.OrdId=OrdSeq.OrdID And X.DeptId=OrdSeq.Prs



					OPEN CURSOR_MR_FABRIC

					FETCH NEXT FROM CURSOR_MR_FABRIC INTO	@SNO,@Dept_ID , @Dept_Name,@REQKGS_MR			 

					WHILE @@FETCH_STATUS = 0 		

					BEGIN   



						Exec Sp_MR_Fabric  @Ordid,@SNo,@Dept_ID,@Dept_Name,@REQKGS_MR,0,0,NULL,NULL,NULL,NULL,NULL,'Y','PR'



					FETCH NEXT FROM CURSOR_MR_FABRIC INTO	@SNO,@Dept_ID , @Dept_Name,@REQKGS_MR

					END

					CLOSE CURSOR_MR_FABRIC 

					DEALLOCATE CURSOR_MR_FABRIC

				END

				ELSE

				BEGIN

					DECLARE CURSOR_MR_FABRIC_1 CURSOR FOR 	

					SELECT  OrdSeq.Sl,X.DeptId,Case When DeptName='CUTTING' Then 'CUT(LOT)' Else DeptName End As DeptName,X.ReqKgs From (Select OrdId,DeptId,Sum(ReqKgs) As ReqKgs From Pro_ReqYarn Where OrdId=@Ordid Group By OrdId,DeptId Union Select OrdId,DeptId,Sum(ReqKgs) As ReqKgs From Pro_ReqKnitt Where OrdId=@Ordid Group By OrdId,DeptId) X Inner Join Mas_Dept On X.DeptId=Mas_Dept.DeptID Inner Join OrdSeq On OrdSeq.OrdID = @ORdid  And X.DeptId=OrdSeq.Prs



					OPEN CURSOR_MR_FABRIC_1

					FETCH NEXT FROM CURSOR_MR_FABRIC_1 INTO	@SNO,@Dept_ID , @Dept_Name,@REQKGS_MR			 

					WHILE @@FETCH_STATUS = 0 		

					BEGIN   

					SELECT @ShortageKGS =  IsNull(ShortKgs,0) From  Trs_Shortage Where OrdId=@Ordid And Dept= @Dept_ID

					SET @TOTALKGS = @REQKGS_MR + @ShortageKGS



					IF  (SELECT COUNT(*) FROM Prog_ClrComb INNER JOIN OrderQtyDtl ON Prog_ClrComb.OrdID = OrderQtyDtl.OrdID AND Prog_ClrComb.StyleNo = OrderQtyDtl.StyleNo AND Prog_ClrComb.ClrCombID = OrderQtyDtl.ColID LEFT OUTER JOIN Prog_Component ON Prog_ClrComb.OrdID
 = Prog_Component.OrdID AND Prog_ClrComb.StyleNo = Prog_Component.StyleNo AND Prog_ClrComb.compID = Prog_Component.CompID AND Prog_ClrComb.ID = Prog_Component.sl WHERE Prog_ClrComb.OrdID =@OrdiD AND Prog_ClrComb.StyleNo =@StyleNo ) >0

					BEGIN

						If (Select Count(*) From MR_Fabric Where OrdId=@Ordid And DeptId=@Dept_ID) > 0

							Exec Sp_MR_Fabric @ORdid,@SNo,@Dept_ID,@Dept_Name,@TOTALKGS,0,0,NULL,NULL,NULL,NULL,NULL,'N','PR'

						ELSE

							Exec Sp_MR_Fabric @Ordid,@SNo,@Dept_ID,@Dept_Name,@TOTALKGS,0,0,NULL,NULL,NULL,NULL,NULL,'Y','PR'

					END

					ELSE

					BEGIN

						Exec Sp_MR_Fabric @Ordid,@SNo,@Dept_ID,@Dept_Name,@TOTALKGS,0,0,NULL,NULL,NULL,NULL,NULL,'Y','PR'

					END



					FETCH NEXT FROM CURSOR_MR_FABRIC_1 INTO	@SNO,@Dept_ID , @Dept_Name,@REQKGS_MR

					END

					CLOSE CURSOR_MR_FABRIC_1 

					DEALLOCATE CURSOR_MR_FABRIC_1



				END





				UPDATE MR_PRocessDetails SET REC_Update = 0 WHERE Ordid =@Ordid And StyleNo = @StyleNo 



				SET @SNo =0 ; SET @Dept_ID =0 ; SET @COLOUR_ID = 0 ; SET @DESIGN_ID_MR = 0



				DECLARE CURSOR_MR_PROCESSDETAILS CURSOR FOR 	

					SELECT OrdSeq.Sl,X.DeptId,ColId,Designid From (Select Ordid,Styleno,DeptId,ColId, 0 as Designid From Pro_ReqYarn Where OrdId=@Ordid And StyleNo=@StyleNo Group By Ordid,Styleno,DeptId,Colid Union Select Ordid,Styleno,DeptId,ColId,DesignId From Pro_ReqKnitt Where OrdId=@Ordid And StyleNo=@StyleNo Group By  Ordid,Styleno,DeptId,colid,DesignId) X Inner Join Mas_Dept On X.DeptId=Mas_Dept.DeptID Inner Join OrdSeq On X.OrdId=OrdSeq.OrdID And X.DeptId=OrdSeq.Prs 



					OPEN CURSOR_MR_PROCESSDETAILS

					FETCH NEXT FROM CURSOR_MR_PROCESSDETAILS INTO	@SNo,@Dept_Id,@Colour_id,@Design_ID_MR

					WHILE @@FETCH_STATUS = 0 		

					BEGIN   

						If (Select Count(1) from MR_PRocessDetails WHERE Ordid =@Ordid and StyleNo=@StyleNo And DeptID=@Dept_ID And ColId=@COLOUR_ID And DesignID =@DESIGN_ID_MR) = 0 

						INSERT INTO MR_PRocessDetails (Ordid,StyleNo,slno,DeptId,ColID,DesignID,REC_UPDATE) VALUES (@Ordid,@StyleNo,@SNo,@Dept_ID,@COLOUR_ID,@DESIGN_ID_MR,1)

						ELSE

						Update MR_PRocessDetails SET REC_UPDATE = 1 WHERE Ordid =@Ordid And StyleNo = @StyleNo And DeptId = @Dept_ID And ColId = @COLOUR_ID And designId = @DESIGN_ID_MR 





						FETCH NEXT FROM CURSOR_MR_PROCESSDETAILS INTO	@SNo,@Dept_Id,@Colour_id,@Design_ID_MR

					END



					CLOSE CURSOR_MR_PROCESSDETAILS 

					DEALLOCATE CURSOR_MR_PROCESSDETAILS



					Delete from MR_PRocessDetails WHERE Ordid =@Ordid and StyleNo=@StyleNo And isNull(REC_UPDATE, 0) = 0



										

END

