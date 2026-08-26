/*;=============================================   
; Author           :  Global Software's    
; Create date      :  02/09/2021    
; Create By        :  ASLAM  
; Description      :  Program Balance_Multi GRN Update  
; Change Person    :  ASLAM
; Last Change Date :  02/09/2019 09.00 AM 
; =============================================  */  
CREATE PROCEDURE Sp_st_Prog_fabric(@OrdId Int,@DeptId Int,@OutQty Numeric (18,3),@InQty Numeric (18,3),@EntryFlg Char(2),
@FabId int, @ColId int,@CntId int,@DesignID int, @FinDiaId int ,@FinGSM Numeric(18,2),@LL varchar(15),@OurDCID int,@FinalProcess char(1),@InMtr Numeric(18,3),@OutMtr Numeric(18,3) )  As 
 
 if @EntryFlg ='+' and @OurDCID <> 0
 begin
  Update ST_ProgBalance_Fabric SET GRNKgs = isnull(grnKgs,0) + @InQty, GRNMtr = ISNULL(grnmtr,0) + @InMtr WHERE ORdid =@OrdId and DeptID =@DeptId And FabId = @FabId And ColId =@ColId 
 And CntId=@CntId And DesignID =@DesignID and FinDiaId =@FinDiaId and FinGSM =@FinGSM and LL = @LL 
 End 
 if @EntryFlg ='-' and @OurDCID <> 0
 begin
  Update ST_ProgBalance_Fabric SET GRNKgs = isnull(grnKgs,0) - @InQty , GRNMtr = ISNULL(grnmtr,0) - @InMtr WHERE ORdid =@OrdId and DeptID =@DeptId And FabId = @FabId And ColId =@ColId 
 And CntId=@CntId And DesignID =@DesignID and FinDiaId =@FinDiaId and FinGSM =@FinGSM and LL = @LL 
 End 
  if @EntryFlg ='+' and @OurDCID = 0 and @FinalProcess='N'
 begin
  Update ST_ProgBalance_Fabric SET DCKgs = ISNULL(DCKgs,0) + @OutQty, GRNKgs = isnull(grnKgs,0) + @InQty, DCMtr = ISNULL(DCMtr,0) + @OutMtr, GRNMtr = isnull(GRNMtr,0) + @InMtr WHERE ORdid =@OrdId and DeptID =@DeptId And FabId = @FabId And ColId =@ColId 
 And CntId=@CntId And DesignID =@DesignID and FinDiaId =@FinDiaId and FinGSM =@FinGSM and LL = @LL 
 End 
 if @EntryFlg ='-' and @OurDCID = 0 and @FinalProcess = 'N'
 begin
 
 Update ST_ProgBalance_Fabric SET DCKgs = ISNULL(DCKgs,0) -  @OutQty, GRNKgs = isnull(grnKgs,0) - @InQty, DCMtr = ISNULL(DCMtr,0) -  @OutMtr, GRNMtr = isnull(GRNMtr,0) - @InMtr WHERE ORdid =@OrdId and DeptID =@DeptId And FabId = @FabId And ColId =@ColId 
 And CntId=@CntId And DesignID =@DesignID and FinDiaId =@FinDiaId and FinGSM =@FinGSM and LL = @LL 
 End 
 
  if @EntryFlg ='+' and @OurDCID = 0 and @FinalProcess='Y'
 begin
 
 Update ST_ProgBalance_Fabric SET DCKgs = ISNULL(DCKgs,0) + @OutQty , DCMtr = ISNULL(DCMtr,0) + @OutMtr  WHERE ORdid =@OrdId and DeptID =@DeptId And FabId = @FabId And ColId =@ColId 
 And CntId=@CntId And DesignID =@DesignID and FinDiaId =@FinDiaId and FinGSM =@FinGSM and LL = @LL 
 End 
 if @EntryFlg ='-' and @OurDCID = 0 and @FinalProcess = 'Y'
 begin
 
 Update ST_ProgBalance_Fabric SET DCKgs = ISNULL(DCKgs,0) -  @OutQty, DCMtr = ISNULL(DCMtr,0) -  @OutMtr WHERE ORdid =@OrdId and DeptID =@DeptId And FabId = @FabId And ColId =@ColId 
 And CntId=@CntId And DesignID =@DesignID and FinDiaId =@FinDiaId and FinGSM =@FinGSM and LL = @LL 
 End 


 