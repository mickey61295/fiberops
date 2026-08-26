
/*
;=============================================
; Author		:		Global Software's
; Create date		:		25/02/2022
; Create By		:		ASLAM
; Description		:		Bundle Barcode Issue
; Change Person		:		ASLAM
; Last Change Date	:		25/02/2022 11.35
; =============================================	
*/


CREATE PROCEDURE SP_PcsBarcode_Check (@NewFlg as Char(1), @Barcode Varchar(30), @Coycode int,@ProdDB Varchar(100),@LineID int,@StageID Int,@ProdDate Date,@finyear Char(2),@HrsID int,@TimeRangeID int,@RejectionFlg Char(1), @Msg Varchar(max) OUTPUT,@ValidFlg Varchar(Max) OUTPUT) AS

DECLARE @Valid AS CHAR(1) ='N' ,@FinalProcessDone Char(1) = 'N' ,@Completed Char(1) = 'N'
DECLARE @ID INT,@BundleMasID Int,@BundleID Int,@FinalStageID INT,@TemplateID INT,@ReworkRepeatFlg char(1),@LineFeed Char(1),@FinalProcessStage CHAR(1),@ReworkFlg Char(1),@SourceStageId INT,@contractorID int,@EntryTime DATETIME,@RewrkIssueID int

SELECT @EntryTime = GETDATE()
SET @ReworkFlg ='N'

SET @Msg =''
SELECT @FinalStageId = IsNull(Final_StageId_2,0) From Mas_Exporter WHERE ExpId = @Coycode
SELECT @TemplateID =  IsNull(TemplateId,1) From Mas_TemplateAllocate Where Coycode=@Coycode
SELECT @BundleMasID = BundleMasId from Fiber_production..Pay_BundlePcs_Barcode Where PcsBArcode = @Barcode

/* tempTable Creation */

SELECT A.*,PcsBarcode,Pcs_Status,PostingFlg,ProdId,BundlePcsId  INTO  #DT_Temp  FROM Pay_BarcodeGeneration A INNER JOIN Fiber_production..Pay_BundlePcs_Barcode B ON A.BundleMasId = B.BundleMasID And A.BundleID= B.BundleId Where B.PcsBarcode=@Barcode  and Completed is Null AND 1 =2 

INSERT INTO #DT_Temp SELECT  A.*,PcsBarcode,Pcs_Status,PostingFlg,ProdId,BundlePcsId  FROM Pay_BarcodeGeneration A INNER JOIN Fiber_production..Pay_BundlePcs_Barcode B ON A.BundleMasId = B.BundleMasID And A.BundleID= B.BundleId Where B.PcsBarcode=@Barcode  and Completed is Null

IF (Select Count(1) from Fiber_PRoduction..Pay_BundlePcs_Barcode Where PcsBarcode = @Barcode) > 0 
	SET @Valid ='Y'
ELSE
	SET @Valid ='N'


 IF (SELECT isNull(FINAL_STAGEID_2,0) From Mas_Exporter WHERE ExpID=@Coycode) = @StageID 
		SET @FinalProcessStage = 'Y'
    Else
        SET @FinalProcessStage = 'N'
    

If @Valid ='Y'
BEGIN
    If (Select Count(1) from Pay_Pcs_ProdEntry Where Barcode = @Barcode and StageID=@FinalStageId) > 0 
       SET @FinalProcessDone = 'Y'


		If (Select Count(1) from Prod_PcsRworkIssue Where Barcode =@Barcode and StageID=@StageID and isNull(ReworkApproval,'N') ='N' ) > 0
		BEGIN
            SET @ReworkRepeatFlg = 'Y'
            SET @LineFeed = 'Y'
		END
		ELSE
            SET @ReworkRepeatFlg = 'N'
END

IF @LineFeed = 'Y' AND @ReworkRepeatFlg = 'Y'
	SET @ReworkFlg = 'Y'

 IF (Select count(1) From Fiber_production..Pay_BundlePcs_Barcode A INNER JOIN Pay_BarcodeGeneration B ON A.BundleMasId = B.BundleMasID and A.BundleId =B.BundleId  Where PcsBarCode=@Barcode and Coycode=@Coycode) > 0 
      SET @VALID ='Y'
 ELSE
	  SET @VALID ='N'


  IF (SELECT COUNT(1) from Pay_BarcodeGeneration Where BundleMasId =@BundleMasID and IsNull(Completed,'N') = 'Y' ) >= 1 
    SET @Completed = 'Y'
  Else
    SET @Completed ='N'
            

  SELECT @SourceStageId = Isnull(SourceStageId,0) From PROD_SEQUENCE INNER JOIN #DT_Temp S1 ON  PROD_SEQUENCE.OrdID = S1.OrdId AND PROD_SEQUENCE.StyleNo  = S1.StyleNo AND PROD_SEQUENCE.StageID  = @StageID 

  SELECT @LineID = LineID from #DT_Temp 
 
  SELECT @contractorID = isNull(ContractorId,0) from Trs_ContractorAllotment_Det WHERE LineID=@LineID  And StageID = @StageID
   
   SELECT @RewrkIssueID = ID From Prod_PcsRworkIssue Where Barcode = @Barcode and StageID=@StageID and isNull(ReworkFlg,'N') ='Y' and isNull(ReworkApproval,'N') ='N' 


IF @Valid = 'N'
BEGIN
 SELECT  @Msg ='INVALID TAG'
 SELECT  @ValidFlg ='INVALID'
END

IF @Valid = 'Y'
BEGIN
	
	IF @Completed ='Y'
		SELECT  @Msg ='INVALID!!! BUNDLE COMPLETED'  

	IF @FinalProcessDone = 'Y' AND @FinalProcessStage = 'N' AND @ReworkFlg='N'
		SELECT  @Msg ='INVALID!!! FINAL PROCESS PRODUCTION MADE.'  

	IF @FinalProcessDone = 'Y' And @FinalProcessStage = 'Y' And @ReWorkFlg = 'N' 
		SELECT @Msg= 'INVALID!!! ALREADY PRODUCTION MADE ON THIS STAGE.'

	IF (SELECT COUNT(1) from Pay_BarcodeGeneration A INNER JOIN Fiber_production..Pay_BundlePcs_Barcode B ON A.BundleMasID = B.BundleMasID And A.BundleID = B.BundleId where b.PcsBarcode =@Barcode And isNull(LineID,0) > 0) = 0 
		SELECT @Msg= 'INVALID!!! BUNDLE NOT ISSUED TO LINE.'

	IF @SourceStageId = 0 
		SELECT @Msg= 'INVALID SOURCE STAGE.'

	IF @contractorID =0 
		SELECT @Msg= 'INVALID CONTRACTOR.'


	IF @Msg ='' 
	SET @Msg =''
	SELECT  @ValidFlg ='VALID'

END

IF @Msg ='' 
BEGIN
	SET @Valid = 'Y'
	SELECT  @ValidFlg ='VALID'
END
ELSE
BEGIN
	SET @Valid = 'N'
	SELECT  @ValidFlg ='INVALID'
END

BEGIN TRANSACTION
IF @Valid ='Y'
BEGIN
	IF @NewFlg='Y' and @RejectionFlg='N'
	BEGIN
		SELECT @ID =  ISNULL(MAX(ID), 0) + 1  from Pay_Pcs_ProdEntry 
		
	  

	 SELECT @BundleMasID = BundleMasID from Pay_BarcodeGeneration WHERE Barcode = @Barcode
	 SELECT @BundleID = BundleID From #DT_Temp WHERE PcsBarcode = @Barcode

	  
	 If (Select count(*) From Pay_Pcs_ProdEntry Where Barcode=@Barcode and BundleMasID=@BundleMasID and BundleID=@BundleID and ProdDate=@ProdDate and StageID=@StageID and EmpID=@contractorID and WorkType = 'N') = 0 
	 BEGIN
	      Insert Into Pay_Pcs_ProdEntry (ID,ProdDate,Coycode,Finyear,Barcode,StageID,EmpId,WorkType,Pcs,BundleMasID,BundleID,HrsID,SourceStageId,RejectionTypeID,TimeRangeID,EntryTime,ReWorkFlg,ReworkApproval,LineId,ProdOutput_FinalOutput) Values (@ID,@ProdDate,@Coycode,@Finyear,@Barcode,@StageId,@contractorID,'N',1,@BundleMasID,@BundleID,@HrsID,@SourceStageId,'',@TimeRangeID,@EntryTime,@ReWorkFlg,'',@LineID,'P')


		   If @FinalProcessStage = 'Y' 
		   BEGIN
                   Update Fiber_production..Pay_BundlePcs_Barcode SET Pcs_Status = 'G' WHERE PcsBarcode=@Barcode and BundleMasID=@BundleMasID and BundleID=@BundleID
				   Update Pay_CuttProd_Bundle set goodpcs=isnull(goodpcs,0) + 1 WHERE ID=@BundleMasID and BundleID=@BundleID
                   Update Pay_BarcodeGeneration set goodpcs=isnull(goodpcs,0) + 1 WHERE BundleMasID=@BundleMasID and BundleID=@BundleID
           END

		   
	 END
	 ELSE
	 BEGIN
		   If @FinalProcessStage = 'Y' 
		   BEGIN
                   Update Fiber_production..Pay_BundlePcs_Barcode SET Pcs_Status = 'G' WHERE PcsBarcode=@Barcode and BundleMasID=@BundleMasID and BundleID=@BundleID
				   Update Pay_CuttProd_Bundle set goodpcs=isnull(goodpcs,0) + 1 WHERE ID=@BundleMasID and BundleID=@BundleID
                   Update Pay_BarcodeGeneration set goodpcs=isnull(goodpcs,0) + 1 WHERE BundleMasID=@BundleMasID and BundleID=@BundleID
           END
		   ELSE
		   BEGIN
			IF @NewFlg ='Y'
			BEGIN
				Insert Into Pay_Pcs_ProdEntry (ID,ProdDate,Coycode,Finyear,Barcode,StageID,EmpId,WorkType,Pcs,BundleMasID,BundleID,HrsID,SourceStageId,RejectionTypeID,TimeRangeID,EntryTime,ReWorkFlg,LineID,ProdOutput_FinalOutput) Values (@ID,@ProdDate,@Coycode,@Finyear,@Barcode,@StageId,@contractorID,'N',1,@BundleMasID,@BundleID,@HrsID,@SourceStageId,'',@TimeRangeID,@EntryTime,@ReWorkFlg,@LineID,'P')
			END

		   END
	 END
	 IF @ReworkFlg ='Y'
	 UPDATE Prod_PcsRworkIssue SET ReworkApproval = 'Y' WHERE Barcode=@Barcode and BundleMasID=BundlemasId and BundleID=BundleID and ID =@RewrkIssueID and StageID=@StageID and WorkType = 'R'

	 Update Pay_BarcodeGeneration SET Completed = 'Y' Where isNull(Pcs,0) = (isnull(Goodpcs,0) + isNull(RejectionPcs,0)) And Completed is Null
	 Update Pay_CuttProd_Bundle SET Completed = 'Y' Where isNull(Pcs,0) = (isnull(Goodpcs,0) + isNull(RejectionPcs,0)) And Completed is Null

	END
END
COMMIT TRANSACTION



/*
DECLARE @MSG  varchar(200)
DECLaRE @Valid1 Varchar(100)
execute  SP_BundleBarcode_Check 'Y','(21000001)',3,'',62, @MSG OUT,@Valid1 OUT
execute   SP_PcsBarcode_Check  'Y', '(210000011)', 3, '', 0, 26, '28-FEB-2022', '21', 1, 2,@MSG OUT,@Valid1 OUT

print @MSG
print @Valid1
*/
