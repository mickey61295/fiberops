
/*
;=============================================
; Author		:		Global Software's
; Create date		:		25/02/2022
; Create By		:		ASLAM
; Description		:		Rejection Barcode Issue
; Change Person		:		ASLAM
; Last Change Date	:		26/02/2022 11.25
; =============================================	
*/


CREATE PROCEDURE SP_PcsBarcode_Check_Rejection (@NewFlg as Char(1), @Barcode Varchar(30), @Coycode int,@ProdDB Varchar(100),@LineID int,@StageID Int,@ProdDate Date,@finyear Char(2),@HrsID int,@TimeRangeID int,@RejectionFlg Char(1),@BundleID int,@BundleMasID int ,@ContractorID int,@SourceStageID int,@ReWorkFlg Char(1),@RewrkIssueID INT ,@RejectionTypeId Varchar(max)) AS

DECLARE @Valid AS CHAR(1) ='N' ,@FinalProcessDone Char(1) = 'N' ,@Completed Char(1) = 'N'
DECLARE @ID INT,@EntryTime DATETIME
--@FinalStageID INT,@TemplateID INT,@ReworkRepeatFlg char(1),@LineFeed Char(1),@FinalProcessStage CHAR(1),@ReworkFlg Char(1),@SourceStageId INT,@contractorID int,,@RewrkIssueID int

SELECT @EntryTime = GETDATE()

 
 
	IF @NewFlg='Y' and @RejectionFlg='Y'
	BEGIN
	 
		SELECT @ID =  ISNULL(MAX(ID), 0) + 1  from Pay_Pcs_ProdEntry 
		
	  

	 --SELECT @BundleMasID = BundleMasID from Pay_BarcodeGeneration WHERE Barcode = @Barcode
	 --SELECT @BundleID = BundleID From #DT_Temp WHERE PcsBarcode = @Barcode

	  
	 If (Select count(*) From Pay_Pcs_ProdEntry Where Barcode=@Barcode and BundleMasID=@BundleMasID and BundleID=@BundleID and ProdDate=@ProdDate and StageID=@StageID and EmpID=@contractorID and WorkType = 'N') = 0 
	 BEGIN
	 
	      Insert Into Pay_Pcs_ProdEntry (ID,ProdDate,Coycode,Finyear,Barcode,StageID,EmpId,WorkType,Pcs,BundleMasID,BundleID,HrsID,SourceStageId,RejectionTypeID,TimeRangeID,EntryTime,ReWorkFlg,ReworkApproval,LineId,ProdOutput_FinalOutput) Values (@ID,@ProdDate,@Coycode,@Finyear,@Barcode,@StageId,@contractorID,'N',1,@BundleMasID,@BundleID,@HrsID,@SourceStageId,@RejectionTypeId,@TimeRangeID,@EntryTime,@ReWorkFlg,'',@LineID,'P')


		   Update Fiber_production..Pay_BundlePcs_Barcode SET Pcs_Status = 'R' WHERE PcsBarcode=@Barcode and BundleMasID=@BundleMasID and BundleID=@BundleID
           Update Pay_CuttProd_Bundle set RejectionPcs=isnull(RejectionPcs,0) + 1 WHERE ID=@BundleMasID  and BundleID=@BundleID
           Update Pay_BarcodeGeneration set goodpcs=isnull(goodpcs,0) + 1 WHERE BundleMasID=@BundleMasID and BundleID=@BundleID

		   
	 END
	 ELSE
	 BEGIN
			 
			 UPDATE Pay_Pcs_ProdEntry SET RejectionTypeID = @RejectionTypeId WHERE Barcode=@Barcode and BundleMasID=@BundleMasID and BundleID=@BundleID and ProdDate=@ProdDate and StageID=@StageID and EmpID=@ContractorID  and WorkType = 'R'

		   Update Fiber_production..Pay_BundlePcs_Barcode SET Pcs_Status = 'R' WHERE PcsBarcode=@Barcode and BundleMasID=@BundleMasID and BundleID=@BundleID
           Update Pay_CuttProd_Bundle set RejectionPcs=isnull(RejectionPcs,0) + 1 WHERE ID=@BundleMasID  and BundleID=@BundleID
           Update Pay_BarcodeGeneration set goodpcs=isnull(goodpcs,0) + 1 WHERE BundleMasID=@BundleMasID and BundleID=@BundleID
	 END
	 

	END
 